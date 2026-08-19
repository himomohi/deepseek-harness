/** Browser plugin wiring for notification settings and session transitions. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import {
  BROWSER_NOTIFICATION_SETTINGS_NAMESPACE,
  type BrowserNotificationSettings,
} from '../settings.ts'
import { BrowserNotificationsRow } from './BrowserNotificationsRow.tsx'
import type { BrowserNotificationsRowInjected } from './BrowserNotificationsRow.tsx'
import { BrowserNotificationController } from './controller.ts'
import {
  createBrowserNotificationEnvironment,
  type BrowserNotificationEnvironment,
} from './environment.ts'
import { en, zh, type BrowserNotificationKey } from './locales.ts'
import { createBrowserNotificationRowStore } from './settings-store.ts'

export {
  BrowserNotificationController,
  type BrowserNotificationControllerOptions,
  type BrowserNotificationRowActionFace,
  type BrowserNotificationTranslate,
} from './controller.ts'
export {
  createBrowserNotificationEnvironment,
  type BrowserNotificationEnvironment,
  type BrowserNotificationHandle,
  type BrowserNotificationInput,
  type BrowserNotificationPermission,
} from './environment.ts'
export type {
  BrowserNotificationRowState,
  BrowserNotificationStatus,
} from './settings-store.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Browser-notification settings and system notification copy. */
    'settings.browserNotifications': BrowserNotificationKey
  }
}

/** Locale namespace owned by this plugin. */
export const SETTINGS_NS = 'settings.browserNotifications'

/** Required services for settings, sessions, slots, and locale. */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope', 'sessions']

/**
 * Register the browser-notification client plugin with an injectable browser adapter.
 * @param ctx - client Cordis context.
 * @param environment - browser API adapter.
 */
export function applyWithEnvironment(
  ctx: ClientContext,
  environment: BrowserNotificationEnvironment,
): void {
  const settings = ctx.settingsScope.bind<BrowserNotificationSettings>({
    namespace: BROWSER_NOTIFICATION_SETTINGS_NAMESPACE,
  })
  const controller = new BrowserNotificationController({
    settings,
    sessions: ctx.sessions,
    environment,
    translate: ctx.locale.bind(SETTINGS_NS),
  })
  const store = createBrowserNotificationRowStore()

  ctx.effect(
    () => ctx.locale.register(SETTINGS_NS, { zh, en }),
    'ui-browser-notifications: dictionaries',
  )
  ctx.effect(
    () => controller.start(),
    'ui-browser-notifications: settings and session subscriptions',
  )

  const injected = (
    actions: BoundActions<typeof store>,
  ): BrowserNotificationsRowInjected => {
    controller.bind(actions)
    return {
      setEnabled: (enabled) => { void controller.setEnabled(enabled) },
    }
  }
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'browser-notifications',
    order: 30,
    store,
    locale: SETTINGS_NS,
    inject: injected,
  }, BrowserNotificationsRow))
}

/**
 * Register browser notifications against the real browser APIs.
 * @param ctx - client Cordis context.
 */
export function apply(ctx: ClientContext): void {
  applyWithEnvironment(ctx, createBrowserNotificationEnvironment())
}
