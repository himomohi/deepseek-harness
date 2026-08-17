/**
 * The language-server catalog and load-time detection behind `lsp-auto`. Detection resolves one
 * launchable command per language from the configured PATH (first installed candidate wins); a
 * language with no installed candidate may fall back to an npm-cache probe that runs
 * `npx -y -p <packages…>` from a neutral cwd and adopts the absolute bin path it prints. The
 * neutral cwd matters: inside a project directory npm exec prefers the local `node_modules` chain
 * and skips its cache bin-dir PATH injection, so the same probe run from the workspace root can
 * report a package as unavailable that the cache actually holds.
 * @module @deepseek-ai/dsh-lsp-auto/detect
 */

import { tmpdir } from 'node:os'
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'

/** Largest collected stdout/stderr tail a probe retains (bytes). */
const PROBE_MAX_BYTES = 65_536
/** SIGTERM→SIGKILL grace for a probe that outlives its budget. */
const PROBE_GRACE_MS = 1_000

/**
 * One launchable server command. `command` is resolved on the configured PATH (or used verbatim
 * when absolute); `args` are the server's own launch arguments, kept separate from detection.
 */
export interface ServerCandidate {
  /** Bare command name, or an absolute executable path. */
  readonly command: string
  /** Arguments the server spawns with once the command resolves. */
  readonly args: readonly string[]
  /**
   * npm packages whose cache-installed bin to adopt when `command` is not installed. The probe
   * runs the platform shell's `command -v`/`where` for `command` inside `npx -y -p <packages…>`.
   */
  readonly npmPackages?: readonly string[]
}

/** One catalog language: provider id, launch candidates in preference order, and extension routes. */
export interface LanguageSpec {
  /** Stable provider id reserved on `ctx.lsp`; also the `lsp-stdio` server-table key. */
  readonly id: string
  /** Human-readable language label for diagnostics. */
  readonly label: string
  /** Launch candidates in preference order; the first installed one wins. */
  readonly candidates: readonly ServerCandidate[]
  /** Lowercase leading-dot extension → LSP language id. */
  readonly extensionToLanguage: Readonly<Record<string, string>>
}

/**
 * The shipped catalog. Candidate lists follow each language's canonical distribution (the
 * language's own binary first, then maintained equivalents), mirroring editor defaults; extension
 * routes must stay disjoint across languages because the seam reserves extensions exclusively.
 */
export const LANGUAGES: readonly LanguageSpec[] = [
  {
    id: 'typescript',
    label: 'TypeScript/JavaScript',
    candidates: [
      { command: 'typescript-language-server', args: ['--stdio'] },
      {
        command: 'typescript-language-server',
        args: ['--stdio'],
        npmPackages: ['typescript-language-server', 'typescript'],
      },
    ],
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.mts': 'typescript',
      '.cts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
    },
  },
  {
    id: 'python',
    label: 'Python',
    candidates: [
      { command: 'pyright-langserver', args: ['--stdio'] },
      { command: 'basedpyright-langserver', args: ['--stdio'] },
      { command: 'pylsp', args: [] },
      { command: 'pyright-langserver', args: ['--stdio'], npmPackages: ['pyright'] },
    ],
    extensionToLanguage: { '.py': 'python', '.pyi': 'python', '.pyw': 'python' },
  },
  {
    id: 'go',
    label: 'Go',
    candidates: [{ command: 'gopls', args: [] }],
    extensionToLanguage: { '.go': 'go' },
  },
  {
    id: 'rust',
    label: 'Rust',
    candidates: [{ command: 'rust-analyzer', args: [] }],
    extensionToLanguage: { '.rs': 'rust' },
  },
  {
    id: 'c',
    label: 'C/C++',
    candidates: [{ command: 'clangd', args: [] }],
    extensionToLanguage: {
      '.c': 'c',
      '.h': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.c++': 'cpp',
      '.hpp': 'cpp',
      '.hh': 'cpp',
      '.hxx': 'cpp',
      '.ino': 'cpp',
    },
  },
  {
    id: 'lua',
    label: 'Lua',
    candidates: [{ command: 'lua-language-server', args: [] }],
    extensionToLanguage: { '.lua': 'lua' },
  },
]

/** Detection inputs: where to resolve commands and how far a fallback probe may go. */
export interface DetectionOptions {
  /** Extra env merged over the scrubbed ambient env for PATH resolution, probes, and servers. */
  readonly env: Readonly<Record<string, string>>
  /** Whether npm-cache fallback probes run at all. */
  readonly deferred: boolean
  /** Bound for one fallback probe in ms. */
  readonly probeTimeoutMs: number
  /** Aborted when the mounting fiber is disposed during setup. */
  readonly signal: AbortSignal
}

/** One language's detected launch command plus the routes it reserves. */
export interface DetectedServer {
  /** Absolute executable path. */
  readonly command: string
  /** Server launch arguments. */
  readonly args: readonly string[]
  /** Extension routes this server reserves on the seam. */
  readonly extensionToLanguage: Readonly<Record<string, string>>
}

/**
 * Detect one launchable server per catalog language.
 * @param subprocess - the subprocess seam used for PATH resolution and fallback probes.
 * @param options - env, fallback, budget, and setup cancellation.
 * @returns the detected server per language id; languages with no usable candidate are absent.
 */
export async function detectLanguageServers(
  subprocess: SubprocessRuntime,
  options: DetectionOptions,
): Promise<Map<string, DetectedServer>> {
  const detected = new Map<string, DetectedServer>()
  for (const language of LANGUAGES) {
    const server = await detectLanguage(subprocess, language, options)
    if (server !== undefined) detected.set(language.id, server)
  }
  return detected
}

/** Try one language's candidates in order; the first resolvable candidate wins. */
async function detectLanguage(
  subprocess: SubprocessRuntime,
  language: LanguageSpec,
  options: DetectionOptions,
): Promise<DetectedServer | undefined> {
  for (const candidate of language.candidates) {
    if (candidate.npmPackages === undefined) {
      const command = await resolveInstalled(subprocess, candidate.command, options)
      if (command !== undefined) {
        return { command, args: candidate.args, extensionToLanguage: language.extensionToLanguage }
      }
    } else if (options.deferred) {
      const command = await probeNpmCacheBin(subprocess, candidate.command, candidate.npmPackages, options)
      if (command !== undefined) {
        return { command, args: candidate.args, extensionToLanguage: language.extensionToLanguage }
      }
    }
  }
  return undefined
}

/** Resolve an installed command to its absolute path, treating "not installed" as a skip. */
async function resolveInstalled(
  subprocess: SubprocessRuntime,
  command: string,
  options: DetectionOptions,
): Promise<string | undefined> {
  try {
    return await subprocess.resolveExecutable(command, options.env, options.signal)
  } catch {
    return undefined
  }
}

/**
 * Resolve a candidate through the npm cache: run `command -v <bin>`/`where <bin>` inside
 * `npx -y -p <packages…>` from a neutral cwd and adopt the last absolute path it prints (npm may
 * prefix progress notices; the bin path is the final line). The printed path must still exist as
 * an executable — npm noise never becomes a server command.
 * @param subprocess - the subprocess seam used for PATH resolution and the probe process.
 * @param bin - the bin name the probe locates inside the npm exec environment.
 * @param packages - the npm packages whose cache environment provides `bin`.
 * @param options - env, budget, and setup cancellation.
 * @returns the absolute bin path, or `undefined` when npx, the packages, or the bin are unusable.
 */
async function probeNpmCacheBin(
  subprocess: SubprocessRuntime,
  bin: string,
  packages: readonly string[],
  options: DetectionOptions,
): Promise<string | undefined> {
  const npx = await resolveInstalled(subprocess, 'npx', options)
  if (npx === undefined) return undefined
  /* v8 ignore next 2 -- each platform branch is exercised by its own platform matrix; the other is unreachable at run time. */
  const locate = process.platform === 'win32'
    ? ['cmd', '/d', '/c', 'where', bin]
    : ['sh', '-c', `command -v ${bin}`]
  const installs = packages.flatMap(packageName => ['-p', packageName])
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(options.probeTimeoutMs)])
  let handle: ReturnType<SubprocessRuntime['spawn']>
  try {
    handle = subprocess.spawn({
      argv: [npx, '-y', ...installs, ...locate],
      cwd: tmpdir(),
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: PROBE_MAX_BYTES },
        stderr: { maxBytes: PROBE_MAX_BYTES },
      },
      graceMs: PROBE_GRACE_MS,
      env: { ...options.env },
      signal,
    })
  } catch {
    return undefined
  }
  let outcome: Awaited<ReturnType<SubprocessRuntime['spawn']>['done']>
  try {
    outcome = await handle.done
  } catch {
    // Spawn-level failure: npx vanished between resolution and spawn, or the signal fired first.
    return undefined
  }
  const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
  /* v8 ignore next -- split() always yields one element, so at(-1) is never undefined here. */
  const printed = stdout.trim().split('\n').at(-1)?.trim() ?? ''
  if (outcome.exitCode !== 0 || printed === '') return undefined
  return resolveInstalled(subprocess, printed, options)
}
