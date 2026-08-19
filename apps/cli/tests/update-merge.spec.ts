import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compositionalNeedles } from '../src/custom-features.ts'
import { applyForkFeatures } from '../src/update-fork-features.ts'
import {
  continueOfficialMerge,
  insertCompositionalMarker,
  keepCompositionalMarkers,
  planOfficialMergeContinuation,
  resolveConflictText,
} from '../src/update-merge.ts'

const ARGS = 'apps/cli/src/args.ts'
const PATCH = 'packages/bundle/web-app/cordis.patch.yml'
const WEB_INDEX = 'packages/bundle/web-app/src/index.ts'
const SETTINGS_CSS = 'packages/client/ui-settings-general/src/client/SettingsRoot.module.css'
const NEEDLES = compositionalNeedles()

function versionConflict(ours: string, theirs: string): string {
  return [
    '{',
    '<<<<<<< HEAD',
    `  "version": "${ours}",`,
    '=======',
    `  "version": "${theirs}",`,
    '>>>>>>> upstream/master',
    '  "name": "pkg"',
    '}',
    '',
  ].join('\n')
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

function initRepo(dir: string): void {
  git(dir, ['init', '-b', 'master'])
  git(dir, ['config', 'user.name', 'DeepSeek Harness Test'])
  git(dir, ['config', 'user.email', 'test@example.invalid'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}

function write(root: string, relative: string, content: string): void {
  const abs = join(root, relative)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

describe('resolveConflictText', () => {
  it('keeps the official version when that is the only hunk', () => {
    const resolved = resolveConflictText('packages/foo/package.json', versionConflict('1.0.0', '2.0.0'), NEEDLES)
    expect(resolved).toContain('"version": "2.0.0"')
    expect(resolved).toContain('"name": "pkg"')
    expect(resolved).not.toContain('<<<<<<<')
  })

  it('keeps the official version in a diff3 hunk', () => {
    const content = [
      '{',
      '<<<<<<< HEAD',
      '  "version": "1.0.1",',
      '||||||| merged common ancestors',
      '  "version": "1.0.0",',
      '=======',
      '  "version": "2.0.0",',
      '>>>>>>> upstream/master',
      '}',
      '',
    ].join('\n')
    expect(resolveConflictText('package.json', content, NEEDLES)).toContain('"version": "2.0.0"')
  })

  it('leaves a mixed package.json hunk unmerged', () => {
    const content = [
      '{',
      '<<<<<<< HEAD',
      '  "version": "1.0.0",',
      '  "name": "fork",',
      '=======',
      '  "version": "2.0.0",',
      '  "name": "official",',
      '>>>>>>> upstream/master',
      '}',
    ].join('\n')
    expect(resolveConflictText('package.json', content, NEEDLES)).toBeUndefined()
  })

  it('keeps a restorable default-web marker when that is the only difference', () => {
    const content = [
      '<<<<<<< HEAD',
      "      const profile = options.profile ?? 'web'",
      '=======',
      '      const profile = options.profile',
      '>>>>>>> upstream/master',
      '',
    ].join('\n')
    expect(resolveConflictText(ARGS, content, NEEDLES)).toContain("const profile = options.profile ?? 'web'")
  })

  it('leaves an implementation hunk unmerged', () => {
    const content = [
      '<<<<<<< HEAD',
      '      await jobs.cancel(id)',
      '=======',
      '      await jobs.stop(id)',
      '>>>>>>> upstream/master',
      '',
    ].join('\n')
    expect(resolveConflictText('packages/client/ui-jobs/src/client/JobListAction.tsx', content, NEEDLES)).toBeUndefined()
  })
})

describe('planOfficialMergeContinuation', () => {
  it('takes the official lockfile and writes resolved package.json files', () => {
    const plan = planOfficialMergeContinuation([
      { path: 'packages/a/package.json', content: versionConflict('0.1.0-rc.6', '0.1.0-rc.7') },
      { path: 'pnpm-lock.yaml', content: '<<<<<<< HEAD\nlock\n=======\nofficial\n>>>>>>> up\n' },
      { path: 'README.md', content: '<<<<<<< HEAD\nfork\n=======\nofficial\n>>>>>>> up\n' },
    ], NEEDLES)
    expect(plan.writes).toHaveLength(1)
    expect(plan.writes[0]?.path).toBe('packages/a/package.json')
    expect(plan.takeTheirs).toEqual(['pnpm-lock.yaml'])
    expect(plan.takeOurs).toEqual([])
    expect(plan.unresolved).toEqual(['README.md'])
  })

  it('leaves a missing unmerged file unresolved', () => {
    const plan = planOfficialMergeContinuation([{ path: 'gone.ts', content: undefined }], NEEDLES)
    expect(plan.unresolved).toEqual(['gone.ts'])
  })
})

describe('insertCompositionalMarker', () => {
  it('inserts the Korean locale row after the English locale row', () => {
    const next = insertCompositionalMarker(PATCH, [
      '    - id: locale',
      "      name: '@deepseek-ai/dsh-client-locale'",
      '',
    ].join('\n'), '@deepseek-ai/dsh-client-locale-ko')
    expect(next).toContain("name: '@deepseek-ai/dsh-client-locale-ko'")
    expect(next).toContain('- id: locale-ko')
  })

  it('adds the default web profile on the exact assignment', () => {
    const next = insertCompositionalMarker(
      ARGS,
      '      const profile = options.profile\n',
      "const profile = options.profile ?? 'web'",
    )
    expect(next).toContain("const profile = options.profile ?? 'web'")
  })

  it('registers update and stop before program.parse', () => {
    const stub = [
      '  const rejectParentOptions = (command: string): void => { void command }',
      '  try {',
      '    program.parse(argv, { from: \'user\' })',
      '  } catch {',
      '    return',
      '  }',
      '',
    ].join('\n')
    const next = applyForkFeatures(ARGS, stub)
    expect(next).toContain("program.command('update')")
    expect(next).toContain("program.command('stop')")
    expect(next.indexOf("program.command('update')")).toBeLessThan(next.indexOf("program.command('stop')"))
  })

  it('does not invent a queue field without the official shift hook', () => {
    expect(insertCompositionalMarker(
      'packages/host/apiproxy/src/api-proxy.ts',
      'class ApiProxy {}\n',
      'private readIndex = 0',
    )).toBeUndefined()
  })

  it('appends the real phone-width settings layout', () => {
    const next = insertCompositionalMarker(SETTINGS_CSS, '.root { display: flex; }\n', '@media (max-width: 720px)')
    expect(next).toContain('@media (max-width: 720px)')
    expect(next).toContain('.overlay')
    expect(next).toContain('.navList')
  })

  it('inserts the open-browser YAML key under printUrl', () => {
    const next = insertCompositionalMarker(
      PATCH,
      '        printUrl: true\n        surfaceContext: true\n',
      'openBrowser: !!js ctx.webStartup.openBrowser',
    )
    expect(next).toContain('openBrowser: !!js ctx.webStartup.openBrowser')
  })

  it('inserts the open-browser call beside localWebUrl', () => {
    const next = insertCompositionalMarker(
      WEB_INDEX,
      '      const url = localWebUrl(ctx)\n      console.log(url)\n',
      'internals.openBrowser(url)',
    )
    expect(next).toContain('internals.openBrowser(url)')
  })
})

describe('applyForkFeatures', () => {
  it('turns the official shift queue into the cursor FrameQueue', () => {
    const official = [
      'class FrameQueue<F> {',
      '  private buffer: F[] = []',
      '  private waiter: (() => void) | undefined',
      '  private done = false',
      '',
      '  async *iterate(signal: AbortSignal, cleanup: () => void): AsyncGenerator<F> {',
      '    const onAbort = (): void => { this.end() }',
      '    signal.addEventListener(\'abort\', onAbort, { once: true })',
      '    try {',
      '      while (true) {',
      '        while (this.buffer.length > 0) yield this.buffer.shift() as F',
      '        if (this.done || signal.aborted) return',
      '        await new Promise<void>((resolve) => { this.waiter = resolve })',
      '        this.waiter = undefined',
      '      }',
      '    } finally {',
      '      signal.removeEventListener(\'abort\', onAbort)',
      '      cleanup()',
      '    }',
      '  }',
      '}',
      '',
    ].join('\n')
    const next = applyForkFeatures('packages/host/apiproxy/src/api-proxy.ts', official)
    expect(next).toContain('private readIndex = 0')
    expect(next).toContain('private take(): F')
    expect(next).toContain('this.readIndex += 1')
    expect(next).toContain('this.buffer.splice(0, this.readIndex)')
    expect(next).not.toContain('this.buffer.shift()')
  })

  it('replaces the official required-profile error with default web launch', () => {
    const official = [
      '    .action((args: string[], options: BootOptions & { profile?: string }) => {',
      '      if (options.profile === undefined) {',
      "        program.error('error: --profile <name> is required')",
      '      }',
      '      const profile = options.profile',
      '      resolved = resolveBoot(program, profile, options, args)',
      '    })',
      '',
    ].join('\n')
    const next = applyForkFeatures(ARGS, official)
    expect(next).toContain("const profile = options.profile ?? 'web'")
    expect(next).not.toContain('error: --profile <name> is required')
    expect(next).toContain("first === '-h'")
  })

  it('installs complete browser auto-open onto the official thin web-app', () => {
    const official = [
      "import { createRequire } from 'node:module'",
      'export interface Config {',
      '  printUrl: boolean',
      '  surfaceContext: boolean',
      '  trustedHosts: string[]',
      '}',
      'export const Config: z<Config> = z.object({',
      '  printUrl: z.boolean().default(true),',
      '  surfaceContext: z.boolean().default(true),',
      '  trustedHosts: z.array(String).default([]),',
      '})',
      'export const internals: { resolveDistIndex: () => string } = { resolveDistIndex }',
      '    const printUrl = (): void => {',
      '      const lanCandidate = runtime.lanAddresses[0]',
      '      const port = ctx.webServer.port',
      '      console.log(`dsh web: ${localWebUrl(ctx)}${lanCandidate === undefined ? \'\' : ` (LAN: http://${lanCandidate}:${String(port)})`}`)',
      '    }',
      '',
    ].join('\n')
    const next = applyForkFeatures('packages/bundle/web-app/src/index.ts', official)
    expect(next).toContain('openBrowser: boolean')
    expect(next).toContain('function launchDefaultBrowser')
    expect(next).toContain('internals.openBrowser(url)')
    expect(next).toContain("from 'node:child_process'")
  })

  it('is a no-op on the current fork FrameQueue', () => {
    const current = [
      'class FrameQueue<F> {',
      '  private buffer: F[] = []',
      '  private readIndex = 0',
      '  private take(): F {',
      '    const item = this.buffer[this.readIndex] as F',
      '    this.readIndex += 1',
      '    return item',
      '  }',
      '}',
      '',
    ].join('\n')
    expect(applyForkFeatures('packages/host/apiproxy/src/api-proxy.ts', current)).toBe(current)
  })

  it('restores the Chinese hero title', () => {
    const next = applyForkFeatures(
      'packages/client/ui-conversation/src/client/locales.ts',
      "  'hero.headline': '探索未至之境',\n  'hero.headline': 'Into the Unknown',\n",
    )
    expect(next).toContain("'hero.headline': 'DeepSeek'")
    expect(next).toContain("'hero.headline': 'Into the Unknown'")
    expect(next).not.toContain('探索未至之境')
  })
})

describe('continueOfficialMerge', () => {
  it('finishes a merge whose only conflict is a package.json version', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-update-merge-version-'))
    try {
      initRepo(root)
      write(root, 'package.json', '{\n  "name": "pkg",\n  "version": "1.0.0"\n}\n')
      git(root, ['add', 'package.json'])
      git(root, ['commit', '-m', 'ancestor'])
      git(root, ['checkout', '-b', 'official'])
      write(root, 'package.json', '{\n  "name": "pkg",\n  "version": "2.0.0"\n}\n')
      git(root, ['commit', '-am', 'official version'])
      git(root, ['checkout', 'master'])
      write(root, 'package.json', '{\n  "name": "pkg",\n  "version": "1.0.1"\n}\n')
      git(root, ['commit', '-am', 'fork version'])
      expect(() => git(root, ['merge', 'official', '--no-edit'])).toThrow()
      const result = continueOfficialMerge(root)
      expect(result.ok).toBe(true)
      expect(result.remaining).toEqual([])
      expect(readFileSync(join(root, 'package.json'), 'utf8')).toContain('"version": "2.0.0"')
      expect(() => git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])).toThrow()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('keeps a restorable marker and stops on a real content conflict', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-update-merge-mixed-'))
    try {
      initRepo(root)
      write(root, ARGS, '      const profile = options.profile;\n')
      write(root, 'note.txt', 'shared\n')
      git(root, ['add', ARGS, 'note.txt'])
      git(root, ['commit', '-m', 'ancestor'])
      git(root, ['checkout', '-b', 'official'])
      write(root, ARGS, '      const profile = options.profile\n')
      write(root, 'note.txt', 'official body\n')
      git(root, ['commit', '-am', 'official'])
      git(root, ['checkout', 'master'])
      write(root, ARGS, "      const profile = options.profile ?? 'web'\n")
      write(root, 'note.txt', 'fork body\n')
      git(root, ['commit', '-am', 'fork'])
      expect(() => git(root, ['merge', 'official', '--no-edit'])).toThrow()
      const result = continueOfficialMerge(root)
      expect(result.ok).toBe(false)
      expect(result.remaining).toContain('note.txt')
      expect(result.resolved).toContain(ARGS)
      expect(readFileSync(join(root, ARGS), 'utf8')).toContain("options.profile ?? 'web'")
      git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('inserts a missing Korean locale row after a clean tree', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-update-merge-keep-'))
    try {
      initRepo(root)
      write(root, PATCH, [
        '    - id: locale',
        "      name: '@deepseek-ai/dsh-client-locale'",
        '',
      ].join('\n'))
      git(root, ['add', PATCH])
      git(root, ['commit', '-m', 'locale'])
      const kept = keepCompositionalMarkers(root)
      expect(kept).toContain(PATCH)
      expect(readFileSync(join(root, PATCH), 'utf8')).toContain('@deepseek-ai/dsh-client-locale-ko')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
