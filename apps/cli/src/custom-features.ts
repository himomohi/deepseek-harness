/**
 * Fork-owned features that `dsh update` must still find after an upstream merge.
 * Independent packages usually survive a clean merge; core-file patches do not.
 * @module @deepseek-ai/dsh/custom-features
 */

interface FeatureNeedle {
  readonly path: string
  readonly needle: string
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
      },
    ],
  },
  {
    id: 'llm-opencodex',
    kind: 'package',
    paths: ['packages/llm/llm-opencodex/package.json'],
    contains: [
      {
        path: 'packages/bundle/base/cordis.patch.yml',
        needle: '@deepseek-ai/dsh-llm-opencodex',
      },
    ],
  },
]

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
