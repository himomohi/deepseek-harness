/**
 * Fork-owned features that `dsh update` must still find after an upstream merge.
 * Independent packages usually survive a clean merge; core-file patches do not.
 *
 * Retired with the 2026-09 official sync (0.1.5 transport replacement):
 * `browser-auto-open` (the official web app now owns the handoff, on by
 * default, with its own SSH suppression), `job-cancel`, and the Host/WebSocket
 * halves of `linear-streaming-queues` (the unary-remote migration deleted the
 * apiproxy transport they patched; the SDK cursor queue remains).
 * @module @deepseek-ai/dsh/custom-features
 */

/** A file substring `dsh update` must still find after an official merge. */
export interface FeatureNeedle {
  readonly path: string
  readonly needle: string
  /**
   * When true, `dsh update` may apply the complete feature so the official merge can finish.
   * A needle without a matching apply function keeps the fork side of that file.
   */
  readonly restorable?: boolean
}

export interface ForkFeature {
  readonly id: string
  readonly kind: 'package' | 'core-patch'
  readonly paths?: readonly string[]
  readonly contains?: readonly FeatureNeedle[]
}

interface FeatureCheck {
  readonly id: string
  readonly kind: ForkFeature['kind']
  readonly ok: boolean
  readonly missing: readonly string[]
}

export interface FeatureReport {
  readonly ok: boolean
  readonly checks: readonly FeatureCheck[]
}

/** Features this fork added on top of `deepseek-ai/deepseek-harness`. */
export const FORK_FEATURES: readonly ForkFeature[] = [
  {
    id: 'locale-ko',
    kind: 'package',
    paths: ['packages/client/locale-ko/package.json'],
    contains: [
      {
        path: 'packages/bundle/web-app/cordis.patch.yml',
        needle: '@deepseek-ai/dsh-client-locale-ko',
        restorable: true,
      },
    ],
  },
  {
    id: 'default-web-launch',
    kind: 'core-patch',
    contains: [
      {
        path: 'apps/cli/src/args.ts',
        needle: "const profile = options.profile ?? 'web'",
        restorable: true,
      },
    ],
  },
  {
    id: 'update-command',
    kind: 'core-patch',
    paths: ['apps/cli/src/update.ts'],
    contains: [
      {
        path: 'apps/cli/src/args.ts',
        needle: "program.command('update')",
        restorable: true,
      },
    ],
  },
  {
    id: 'stop-command',
    kind: 'core-patch',
    paths: ['apps/cli/src/stop.ts'],
    contains: [
      {
        path: 'apps/cli/src/args.ts',
        needle: "program.command('stop')",
        restorable: true,
      },
    ],
  },
  {
    id: 'phone-layout',
    kind: 'core-patch',
    contains: [
      {
        path: 'packages/client/ui-settings-general/src/client/SettingsRoot.module.css',
        needle: '@media (max-width: 720px)',
        restorable: true,
      },
      {
        path: 'packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.module.css',
        needle: '@media (max-width: 720px)',
        restorable: true,
      },
      {
        path: 'packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css',
        needle: '@media (max-width: 720px)',
        restorable: true,
      },
    ],
  },
  {
    id: 'linear-streaming-queues',
    kind: 'core-patch',
    contains: [
      {
        path: 'packages/sdk/client/src/client.ts',
        needle: 'queueReadIndex',
        restorable: true,
      },
    ],
  },
  {
    id: 'browser-notifications',
    kind: 'package',
    paths: ['packages/client/ui-browser-notifications/package.json'],
    contains: [
      {
        path: 'packages/bundle/web-app/cordis.patch.yml',
        needle: '@deepseek-ai/dsh-client-ui-browser-notifications',
        restorable: true,
      },
    ],
  },
  {
    id: 'hero-zh-title',
    kind: 'core-patch',
    contains: [
      {
        path: 'packages/client/ui-conversation/src/client/locales.ts',
        needle: "'hero.headline': 'DeepSeek'",
        restorable: true,
      },
    ],
  },
]

/**
 * Restorable fork needles `dsh update` may apply as complete features after an official merge.
 * @param features - feature list to scan; defaults to {@link FORK_FEATURES}.
 * @returns needles marked `restorable`, in feature order.
 */
export function compositionalNeedles(
  features: readonly ForkFeature[] = FORK_FEATURES,
): readonly FeatureNeedle[] {
  return features.flatMap(feature => (feature.contains ?? []).filter(item => item.restorable === true))
}

export function pickUpstreamBranch(
  refs: readonly string[],
): 'upstream/master' | 'upstream/main' {
  if (refs.includes('upstream/master')) return 'upstream/master'
  if (refs.includes('upstream/main')) return 'upstream/main'
  throw new Error('no upstream default branch (expected upstream/master or upstream/main)')
}

export function verifyCustomFeatures(
  exists: (relativePath: string) => boolean,
  read: (relativePath: string) => string,
  features: readonly ForkFeature[] = FORK_FEATURES,
): FeatureReport {
  const checks = features.map((feature) => {
    const missing: string[] = []
    for (const relativePath of feature.paths ?? []) {
      if (!exists(relativePath)) missing.push(`missing file: ${relativePath}`)
    }
    for (const item of feature.contains ?? []) {
      if (!exists(item.path)) {
        missing.push(`missing file: ${item.path}`)
        continue
      }
      if (!read(item.path).includes(item.needle)) {
        missing.push(`missing marker in ${item.path}: ${item.needle}`)
      }
    }
    return { id: feature.id, kind: feature.kind, ok: missing.length === 0, missing }
  })
  return { ok: checks.every(check => check.ok), checks }
}
