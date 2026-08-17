import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import Lsp, { type LspQueryRequest, type LspQueryResult } from '@deepseek-ai/dsh-lsp'
import * as LspAuto from '@deepseek-ai/dsh-lsp-auto'

const isWin = process.platform === 'win32'
/** The lsp-stdio fake LSP server, reused so detection tests exercise the real protocol path. */
const fixtureServer = join(import.meta.dirname, '../../lsp-stdio/tests/fixture-server.ts')

let root: string
let ws: string
let bin: string

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'lsp-auto-')))
  ws = join(root, 'ws')
  bin = join(root, 'bin')
  await mkdir(ws)
  await mkdir(bin)
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** Write one executable fake command into the test PATH dir. */
async function fakeCommand(name: string, posixBody: string, winBody: string): Promise<void> {
  const path = join(bin, isWin ? `${name}.cmd` : name)
  await writeFile(path, isWin ? `@${winBody}\r\n` : `#!/bin/sh\n${posixBody}\n`)
  if (!isWin) await chmod(path, 0o755)
}

/** A fake language server: execs the shared fixture server, which answers from env-driven results. */
async function fakeLanguageServer(name: string): Promise<void> {
  await fakeCommand(name,
    'exec node "$LSP_AUTO_TEST_FIXTURE"',
    'node "%LSP_AUTO_TEST_FIXTURE%" %*')
}

/** PATH carrying the fake bin dir over the ambient one (or isolated when given no ambient). */
function pathEnv(ambient = true): Record<string, string> {
  const ambientPath = process.env.PATH ?? ''
  const base = ambient ? delimiter + ambientPath : ''
  return { PATH: bin + base, ...isWin ? { PATHEXT: '.CMD' } : {} }
}

/** The env a mount needs to drive the fixture server's scripted definition result. */
function fixtureEnv(target: string): Record<string, string> {
  return {
    LSP_AUTO_TEST_FIXTURE: fixtureServer,
    LSP_FAKE_DEF: JSON.stringify([{
      uri: `file://${join(ws, target)}`,
      range: { start: { line: 3, character: 6 }, end: { line: 3, character: 12 } },
    }]),
  }
}

/** Mount the real seam, runtimes, and one lsp-auto application under one context. */
async function mount(config: Partial<LspAuto.Config> = {}): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(Lsp)
  await ctx.plugin(LocalSubprocessRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: process.cwd() })
  await ctx.plugin(LspAuto, { env: pathEnv(), deferred: false, ...config })
  return ctx
}

/** One definition query against a workspace file, through the seam. */
async function definitionQuery(ctx: Context, file: string): Promise<LspQueryResult> {
  const request: LspQueryRequest = {
    operation: 'goToDefinition',
    filePath: join(ws, file),
    position: { line: 0, character: 0 },
    workspaceRoot: ws,
  }
  return await ctx.lsp.query(request)
}

describe('lsp-auto detection', () => {
  it('routes a detected language through the composed lsp-stdio provider', async () => {
    await writeFile(join(ws, 'a.go'), 'package main\n')
    await fakeLanguageServer('gopls')
    const ctx = await mount({ env: { ...pathEnv(), ...fixtureEnv('subject.go') } })
    const result = await definitionQuery(ctx, 'a.go')
    expect(result).toMatchObject({
      kind: 'locations',
      locations: [{ uri: `file://${join(ws, 'subject.go')}` }],
    })
    await ctx.fiber.dispose()
  })

  it('prefers the first installed candidate over later ones', async () => {
    await writeFile(join(ws, 'a.py'), 'x = 1\n')
    // The primary candidate answers through the fixture; the secondary is a silent no-op stub,
    // so a working query proves the primary was chosen.
    await fakeLanguageServer('pyright-langserver')
    await fakeCommand('pylsp', 'exit 0', 'exit /b 0')
    const ctx = await mount({ env: { ...pathEnv(), ...fixtureEnv('subject.py') } })
    const result = await definitionQuery(ctx, 'a.py')
    expect(result).toMatchObject({ kind: 'locations' })
    await ctx.fiber.dispose()
  })

  it('applies as a no-op when no catalog command resolves on an isolated PATH', async () => {
    await writeFile(join(ws, 'a.go'), 'package main\n')
    await writeFile(join(ws, 'a.c'), 'int main(void) { return 0; }\n')
    const ctx = await mount({ env: pathEnv(false) })
    for (const file of ['a.go', 'a.c']) {
      await expect(definitionQuery(ctx, file)).rejects.toMatchObject({ code: 'LSP_UNAVAILABLE' })
    }
    await ctx.fiber.dispose()
  })
})

describe('lsp-auto npm-cache fallback', () => {
  it('adopts the bin path an npx probe prints, run from a neutral cwd', async () => {
    await writeFile(join(ws, 'a.ts'), 'const x = 1\n')
    const cwdMarker = join(root, 'npx-cwd.marker')
    const argsMarker = join(root, 'npx-args.marker')
    const adopted = join(bin, 'cache-tsserver')
    await fakeLanguageServer('cache-tsserver')
    // The probe answers only the typescript install; every other language's probe fails, so the
    // marker records exactly the one fallback adoption under test.
    await fakeCommand('npx',
      `case " $* " in *"typescript-language-server"*) echo "$PWD" > ${JSON.stringify(cwdMarker)}; printf '%s\\n' "$@" > ${JSON.stringify(argsMarker)}; echo ${JSON.stringify(adopted)};; *) exit 1;; esac`,
      `echo %CD% > ${JSON.stringify(cwdMarker)} & echo %* > ${JSON.stringify(argsMarker)} & echo ${JSON.stringify(adopted)}`)
    const ctx = await mount({
      deferred: true,
      env: { ...pathEnv(), ...fixtureEnv('subject.ts') },
    })
    const result = await definitionQuery(ctx, 'a.ts')
    expect(result).toMatchObject({ kind: 'locations' })
    // The probe ran from the canonical tmp cwd and carried both -p installs.
    expect((await readFile(cwdMarker, 'utf8')).trim()).toBe(realpathSync(tmpdir()))
    const args = await readFile(argsMarker, 'utf8')
    expect(args).toContain('-p')
    expect(args).toContain('typescript-language-server')
    expect(args).toContain('typescript')
    await ctx.fiber.dispose()
  })

  it('never probes when deferred is false', async () => {
    await writeFile(join(ws, 'a.ts'), 'const x = 1\n')
    const marker = join(root, 'npx-ran.marker')
    await fakeCommand('npx',
      `echo ran > ${JSON.stringify(marker)}; exit 0`,
      `echo ran > ${JSON.stringify(marker)}`)
    const ctx = await mount({ deferred: false })
    await expect(definitionQuery(ctx, 'a.ts')).rejects.toMatchObject({ code: 'LSP_UNAVAILABLE' })
    await expect(readFile(marker, 'utf8')).rejects.toThrow()
    await ctx.fiber.dispose()
  })

  it('drops a candidate whose probe exceeds the budget', async () => {
    await writeFile(join(ws, 'a.ts'), 'const x = 1\n')
    await fakeCommand('npx', 'sleep 5', 'ping -n 5 127.0.0.1 > nul')
    const ctx = await mount({ deferred: true, probeTimeoutMs: 250 })
    await expect(definitionQuery(ctx, 'a.ts')).rejects.toMatchObject({ code: 'LSP_UNAVAILABLE' })
    await ctx.fiber.dispose()
  })

  it('drops a candidate whose probe prints a non-executable path', async () => {
    await writeFile(join(ws, 'a.ts'), 'const x = 1\n')
    await fakeCommand('npx', 'echo /definitely/not/an/executable', 'echo \\definitely\\not\\an\\executable')
    const ctx = await mount({ deferred: true })
    await expect(definitionQuery(ctx, 'a.ts')).rejects.toMatchObject({ code: 'LSP_UNAVAILABLE' })
    await ctx.fiber.dispose()
  })
})

describe('lsp-auto lifecycle', () => {
  it('removes every detected provider when the plugin fiber is disposed', async () => {
    await writeFile(join(ws, 'a.go'), 'package main\n')
    await fakeLanguageServer('gopls')
    const ctx = new Context()
    await ctx.plugin(Lsp)
    await ctx.plugin(LocalSubprocessRuntime)
    await ctx.plugin(LocalFileSystem, { cwd: process.cwd() })
    const fiber = await ctx.plugin(LspAuto, {
      env: { ...pathEnv(), ...fixtureEnv('subject.go') },
      deferred: false,
    })
    await expect(definitionQuery(ctx, 'a.go')).resolves.toMatchObject({ kind: 'locations' })
    await fiber.dispose()
    // The seam itself stays alive; only the detected route is gone.
    await expect(definitionQuery(ctx, 'a.go')).rejects.toMatchObject({ code: 'LSP_UNAVAILABLE' })
    await ctx.fiber.dispose()
  })
})

describe('lsp-auto detection edge paths', () => {
  /** A seam whose PATH holds only npx: catalog commands miss, so detection reaches the probe. */
  function probeSeam(spawnImpl: () => unknown): SubprocessRuntime {
    return {
      resolveExecutable: async (command: string) => {
        if (command === 'npx') return '/fake/npx'
        if (command.startsWith('/fake/')) return command
        throw new Error(`not installed: ${command}`)
      },
      spawn: spawnImpl as SubprocessRuntime['spawn'],
      async spawnTerminal() {
        throw new Error('unused by detection')
      },
    } as unknown as SubprocessRuntime
  }

  const detectionOptions = (): LspAuto.DetectionOptions => ({
    env: {},
    deferred: true,
    probeTimeoutMs: 1_000,
    signal: new AbortController().signal,
  })

  it('drops a candidate whose probe spawn throws', async () => {
    const seam = probeSeam(() => {
      throw new Error('spawn refused')
    })
    const detected = await LspAuto.detectLanguageServers(seam, detectionOptions())
    expect(detected.get('typescript')).toBeUndefined()
  })

  it('drops a candidate whose probe process fails to start', async () => {
    const seam = probeSeam(() => ({
      done: Promise.reject(new Error('ENOENT')),
      collected: {},
    }))
    const detected = await LspAuto.detectLanguageServers(seam, detectionOptions())
    expect(detected.get('typescript')).toBeUndefined()
  })

  it('rejects a nonpositive probe budget at load', async () => {
    const ctx = new Context()
    await ctx.plugin(Lsp)
    await ctx.plugin(LocalSubprocessRuntime)
    await ctx.plugin(LocalFileSystem, { cwd: process.cwd() })
    await expect(ctx.plugin(LspAuto, { env: pathEnv(false), deferred: false, probeTimeoutMs: 0 }))
      .rejects.toThrow('lsp-auto: probeTimeoutMs')
    await ctx.fiber.dispose()
  })

  it('aborts detection when disposed during setup and applies as a no-op', async () => {
    const ctx = new Context()
    await ctx.plugin(Lsp)
    await ctx.plugin(LocalSubprocessRuntime)
    await ctx.plugin(LocalFileSystem, { cwd: process.cwd() })
    const lookupStarted = Promise.withResolvers<AbortSignal>()
    vi.spyOn(ctx.subprocess, 'resolveExecutable').mockImplementation(async (_command, _env, signal) => {
      const setupSignal = signal ?? new AbortController().signal
      lookupStarted.resolve(setupSignal)
      return await new Promise<string>((_resolve, reject) => {
        const onAbort = (): void => {
          reject(setupSignal.reason instanceof Error ? setupSignal.reason : new Error(String(setupSignal.reason)))
        }
        setupSignal.addEventListener('abort', onAbort, { once: true })
        if (setupSignal.aborted) onAbort()
      })
    })
    const loading = ctx.plugin(LspAuto, { env: pathEnv(false), deferred: false })
    const setupSignal = await lookupStarted.promise
    // An unrelated fiber mounting and disposing must not abort detection.
    const unrelated = await ctx.plugin(() => {})
    await unrelated.dispose()
    expect(setupSignal.aborted).toBe(false)
    const disposing = loading.dispose()
    // Aborted lookups are per-candidate skips, so setup settles as the no-op path.
    await expect(loading).resolves.toBeDefined()
    await expect(disposing).resolves.toBeUndefined()
    expect(setupSignal.aborted).toBe(true)
    await ctx.fiber.dispose()
  })
})

describe('lsp-auto probe seam absence', () => {
  it('drops the deferred candidate when npx itself is unavailable', async () => {
    const seam = {
      resolveExecutable: async (command: string) => {
        throw new Error(`not installed: ${command}`)
      },
      spawn: () => {
        throw new Error('unreached')
      },
      async spawnTerminal() {
        throw new Error('unused by detection')
      },
    } as unknown as SubprocessRuntime
    const detected = await LspAuto.detectLanguageServers(seam, {
      env: {},
      deferred: true,
      probeTimeoutMs: 1_000,
      signal: new AbortController().signal,
    })
    expect(detected.size).toBe(0)
  })

  it('drops a candidate whose probe exits cleanly but collected no stdout', async () => {
    const seam = probeSeamSilent()
    const detected = await LspAuto.detectLanguageServers(seam, {
      env: {},
      deferred: true,
      probeTimeoutMs: 1_000,
      signal: new AbortController().signal,
    })
    expect(detected.get('typescript')).toBeUndefined()
  })
})

/** A seam whose probe resolves exit 0 with no collected stdout at all. */
function probeSeamSilent(): SubprocessRuntime {
  return {
    resolveExecutable: async (command: string) => {
      if (command === 'npx') return '/fake/npx'
      if (command.startsWith('/fake/')) return command
      throw new Error(`not installed: ${command}`)
    },
    spawn: () => ({
      done: Promise.resolve({ exitCode: 0, signal: null }),
      collected: {},
    }),
    async spawnTerminal() {
      throw new Error('unused by detection')
    },
  } as unknown as SubprocessRuntime
}
