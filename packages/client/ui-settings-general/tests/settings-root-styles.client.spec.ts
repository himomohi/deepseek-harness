/** Settings shell CSS: the phone layout must stack nav above content. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('../src/client/SettingsRoot.module.css', import.meta.url)),
  'utf8',
)

describe('SettingsRoot phone layout', () => {
  it('closes every block', () => {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect((bare.match(/\}/g) ?? []).length).toBe((bare.match(/\{/g) ?? []).length)
  })

  it('stacks the 188px nav on viewports at or below 720px', () => {
    expect(css).toContain('@media (max-width: 720px)')
    expect(css).toContain('flex-direction: column')
    expect(css).toMatch(/\.navList \{[\s\S]*flex-direction: row/)
  })
})
