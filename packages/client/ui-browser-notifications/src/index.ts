/** Host registration for the browser-notification preference. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  BROWSER_NOTIFICATION_SETTINGS_NAMESPACE,
  BrowserNotificationSettingsSchema,
} from './settings.ts'

export {
  BROWSER_NOTIFICATION_ENABLED_FIELD,
  BROWSER_NOTIFICATION_SETTINGS_NAMESPACE,
  BrowserNotificationSettingsSchema,
  type BrowserNotificationSettings,
} from './settings.ts'

const NAMESPACE = settingsNamespace(BROWSER_NOTIFICATION_SETTINGS_NAMESPACE)

/** Host settings service required by this preference-owning plugin. */
export const inject = ['settings']

/**
 * Register the durable browser-notification section before browser clients connect.
 * @param ctx - Host context carrying the settings service.
 */
export function apply(ctx: Context): void {
  ctx.settings.register(NAMESPACE, BrowserNotificationSettingsSchema)
}
