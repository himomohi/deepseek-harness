import { describe, expect, it } from 'vitest'
import {
  FORK_FEATURES,
  pickUpstreamBranch,
  verifyCustomFeatures,
} from '../src/custom-features.ts'

describe('pickUpstreamBranch', () => {
  it('prefers master when both default names exist', () => {
    expect(pickUpstreamBranch(['upstream/main', 'upstream/master'])).toBe('upstream/master')
  })

  it('falls back to main', () => {
    expect(pickUpstreamBranch(['upstream/main'])).toBe('upstream/main')
  })

  it('throws when neither default branch exists', () => {
    expect(() => pickUpstreamBranch(['upstream/dev'])).toThrow(/no upstream default branch/)
  })
})

describe('verifyCustomFeatures', () => {
  it('passes when every package file and marker is present', () => {
    const files = new Map<string, string>()
    for (const feature of FORK_FEATURES) {
      for (const path of feature.paths ?? []) files.set(path, '{}')
      for (const item of feature.contains ?? []) {
        const previous = files.get(item.path) ?? ''
        files.set(item.path, `${previous}\n${item.needle}`)
      }
    }
    const report = verifyCustomFeatures(
      path => files.has(path),
      path => files.get(path) ?? '',
    )
    expect(report.ok).toBe(true)
    expect(report.checks.every(check => check.ok)).toBe(true)
  })

  it('fails a package when its directory is gone', () => {
    const report = verifyCustomFeatures(
      path => path !== 'packages/client/locale-ko/package.json',
      () => '@deepseek-ai/dsh-client-locale-ko',
    )
    const locale = report.checks.find(check => check.id === 'locale-ko')
    expect(report.ok).toBe(false)
    expect(locale?.ok).toBe(false)
    expect(locale?.missing.some(item => item.includes('locale-ko/package.json'))).toBe(true)
  })

  it('fails a package when its composition marker was overwritten', () => {
    const report = verifyCustomFeatures(
      () => true,
      path => path.includes('web-app/cordis.patch.yml')
        ? 'no Korean locale marker here'
        : '@deepseek-ai/dsh-client-locale-ko',
    )
    const locale = report.checks.find(check => check.id === 'locale-ko')
    expect(report.ok).toBe(false)
    expect(locale?.ok).toBe(false)
    expect(locale?.missing[0]).toMatch(/missing marker/)
  })
})
