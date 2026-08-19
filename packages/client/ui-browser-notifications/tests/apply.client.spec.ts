// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import {
  createSnapshotStore,
  SlotRegistry,
  type SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import {
  apply,
  applyWithEnvironment,
  inject,
  SETTINGS_NS,
  type BrowserNotificationEnvironment,
} from '../src/client/index.ts'
import { BrowserNotificationsRow } from '../src/client/BrowserNotificationsRow.tsx'
import type { BrowserNotificationSettings } from '../src/settings.ts'

describe('browser-notification client apply', () => {
  it('registers dictionaries, subscriptions, and the General settings row', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    ctx.provide('connection', {} as never)
    ctx.provide('remote', {} as never)
    const settings = stubSettingsScope<BrowserNotificationSettings>()
    settings.publish({
      status: 'ready',
      value: { enabled: true },
      writable: true,
      revision: 0,
    })
    ctx.provide('settingsScope', { bind: () => settings.scope } as never)
    const sessions = createSnapshotStore<SessionListState>({
      ids: [],
      byId: {},
      current: undefined,
      phase: 'ready',
      subagentsByParent: {},
      jobsBySession: {},
      currentAddress: undefined,
    })
    ctx.provide('sessions', { list: sessions, open: vi.fn() } as never)
    const environment: BrowserNotificationEnvironment = {
      isSupported: () => true,
      getPermission: () => 'granted',
      requestPermission: () => Promise.resolve('granted'),
      notify: () => ({ close: () => {} }),
      isPageActive: () => true,
      focusPage: () => {},
    }
    const slots = ctx.get('slots') as SlotRegistry
    slots.register(
      { name: 'root', children: { 'settings.general.item': { kind: 'list', scope: 'root' } } } as never,
      () => null,
    )

    const fiber = ctx.plugin({
      inject: [...inject],
      apply: (clientCtx) => { applyWithEnvironment(clientCtx, environment) },
    })
    await fiber.await()
    expect(locale.bind(SETTINGS_NS)('title')).toBe('Browser notifications')
    expect(slots.entries('settings.general.item')).toEqual([
      expect.objectContaining({
        component: BrowserNotificationsRow,
        options: expect.objectContaining({ id: 'browser-notifications', order: 30 }),
      }),
    ])
    expect(settings.listenerCount()).toBe(1)
    const entry = slots.entries('settings.general.item')[0]
    const sync = vi.fn()
    const injected = (entry?.inject as
      ((actions: { sync: typeof sync }) => { setEnabled(enabled: boolean): void }))({ sync })
    injected.setEnabled(false)
    await vi.waitFor(() => {
      expect(settings.set).toHaveBeenCalledWith('enabled', false)
    })

    await fiber.dispose()
    expect(slots.entries('settings.general.item')).toHaveLength(0)
    expect(settings.listenerCount()).toBe(0)
    expect(locale.bind(SETTINGS_NS)('title')).toBe('title')

    apply(ctx as never)
    expect(slots.entries('settings.general.item')).toHaveLength(1)
  })

  it('declares the complete client service dependency list', () => {
    expect(inject).toEqual([
      'slots',
      'locale',
      'connection',
      'remote',
      'settingsScope',
      'sessions',
    ])
  })
})
