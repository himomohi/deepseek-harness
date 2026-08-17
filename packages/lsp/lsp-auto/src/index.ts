/**
 * Auto-detecting language-server Service Provider for `ctx.lsp`. One plugin instance scans the
 * shipped language catalog at load, resolves one launchable command per installed language
 * (TypeScript/JavaScript, Python, Go, Rust, C/C++, Lua; npm-cache fallback probes cover languages
 * whose server is not installed), and registers every detected server through a child
 * `dsh-lsp-stdio` instance it composes with the generated server table. The seam, the pooling,
 * the protocol translation, and the model tool all stay in their owning packages; this front owns
 * only the catalog and the detection.
 *
 * Namespace plugin (named exports, no default export). Lifecycle is effect-scoped: disposal
 * unregisters every detected provider and tears down its server processes with the child plugin.
 * @module @deepseek-ai/dsh-lsp-auto
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { LspLocalServerConfig } from '@deepseek-ai/dsh-lsp-stdio'
import * as LspStdio from '@deepseek-ai/dsh-lsp-stdio'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { detectLanguageServers } from './detect.ts'

export {
  LANGUAGES,
  detectLanguageServers,
} from './detect.ts'
export type {
  DetectedServer,
  DetectionOptions,
  LanguageSpec,
  ServerCandidate,
} from './detect.ts'

/** Cordis plugin name for loader diagnostics. */
export const name = 'lsp-auto'

/** Services required by this plugin; the composed child declares its own `fs`/`lsp` needs. */
export const inject = ['subprocess']

/** Default bound for one npm-cache fallback probe (ms), covering a cold package download. */
export const DEFAULT_PROBE_TIMEOUT_MS = 30_000

/** Plugin configuration. */
export interface Config {
  /**
   * Extra env merged over the credential-scrubbed ambient env. Used for PATH resolution during
   * detection, for fallback probes, and for every spawned server. Default `{}`.
   */
  env?: Record<string, string>
  /**
   * Whether languages without an installed server may fall back to npm-cache probes. A
   * network-less or offline deployment sets `false` to keep load local. Default `true`.
   */
  deferred?: boolean
  /** Bound for one fallback probe in ms. Default 30000. */
  probeTimeoutMs?: number
}

export const Config: z<Config> = z.object({
  env: z.dict(String).default({}),
  deferred: z.boolean().default(true),
  probeTimeoutMs: z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_PROBE_TIMEOUT_MS),
})

type ResolvedConfig = Required<Config>

/**
 * Detect installed language servers and register them through a composed `lsp-stdio` child.
 * A machine with no detected language applies as a no-op: nothing registers, and queries fail
 * with the seam's `LSP_UNAVAILABLE` at first use instead of failing every deployment's load.
 * @param ctx - the plugin context (must inject `subprocess`).
 * @param config - the resolved plugin configuration (schemastery has filled every default).
 */
export async function apply(ctx: Context, config: Config): Promise<void> {
  const resolved = config as ResolvedConfig
  assertTimer('probeTimeoutMs', resolved.probeTimeoutMs)

  const setupAbort = new AbortController()
  const stopSetupCancellation = ctx.on('internal/plugin', (fiber) => {
    // An async plugin callback must observe its own disposal before Cordis can
    // run effect cleanup, because unload otherwise waits for this callback.
    if (fiber === ctx.fiber && fiber.uid === null) {
      setupAbort.abort(new Error('lsp-auto setup disposed'))
    }
  })

  const detected = await (async () => {
    try {
      return await detectLanguageServers(ctx.subprocess, {
        env: resolved.env,
        deferred: resolved.deferred,
        probeTimeoutMs: resolved.probeTimeoutMs,
        signal: setupAbort.signal,
      })
    } finally {
      stopSetupCancellation()
    }
  })()

  if (detected.size === 0) return
  const servers: Record<string, LspLocalServerConfig> = {}
  for (const [id, server] of detected) {
    servers[id] = {
      command: server.command,
      args: [...server.args],
      env: { ...resolved.env },
      extensionToLanguage: { ...server.extensionToLanguage },
    }
  }
  // The child's schema fills every per-server default, so this front never duplicates them.
  await ctx.plugin(LspStdio, LspStdio.Config({ servers }))
}

/** Reject a timer value Node would clamp instead of scheduling as configured. */
function assertTimer(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > MAX_TIMER_DELAY_MS) {
    throw new Error(`lsp-auto: ${name} must be a positive integer no greater than ${MAX_TIMER_DELAY_MS}`)
  }
}
