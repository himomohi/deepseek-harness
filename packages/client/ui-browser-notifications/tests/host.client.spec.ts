import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import {
  SettingsProvider,
  settingsNamespace,
  type SettingsNamespace,
} from '@deepseek-ai/dsh-settings'
import {
  apply,
  BROWSER_NOTIFICATION_SETTINGS_NAMESPACE,
  inject,
} from '../src/index.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve({})
  }
  protected persist(
    _namespace: SettingsNamespace,
    _section: Record<string, unknown>,
  ): Promise<void> {
    return Promise.resolve()
  }
}

describe('browser-notification host', () => {
  it('registers, validates, and disposes the durable opt-in', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    const namespace = settingsNamespace(BROWSER_NOTIFICATION_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(namespace)).toEqual({ enabled: false })
    await ctx.settings.update(namespace, { enabled: true })
    expect(ctx.settings.get(namespace)).toEqual({ enabled: true })
    await expect(ctx.settings.update(namespace, { enabled: 'yes' })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(namespace)
  })

  it('declares the Host settings dependency', () => {
    expect(inject).toEqual(['settings'])
  })
})
