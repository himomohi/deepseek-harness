/** Remaining panels must stack or wrap at the same phone breakpoint. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const files = [
  '../src/client/PluginsSettingsSection.module.css',
  '../src/client/PluginCard.module.css',
  '../src/client/fields.module.css',
] as const

function css(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
}

describe('plugin settings phone layout', () => {
  it('wraps tabs and cards below 720px and keeps braces balanced', () => {
    for (const file of files) {
      const text = css(file)
      const bare = text.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(text, file).toContain('@media (max-width: 720px)')
      expect((bare.match(/\}/g) ?? []).length, file)
        .toBe((bare.match(/\{/g) ?? []).length)
    }
  })
})
