/** Browser-notification preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the browser-notification plugin. */
export const BROWSER_NOTIFICATION_SETTINGS_NAMESPACE = 'ui-browser-notifications'

/** Field carrying the browser-notification opt-in. */
export const BROWSER_NOTIFICATION_ENABLED_FIELD = 'enabled'

/** Durable browser-notification section shared by Host and browser. */
export interface BrowserNotificationSettings {
  /** Whether inactive browser pages may show question and completion notifications. */
  enabled: boolean
}

/** Durable browser-notification schema. */
export const BrowserNotificationSettingsSchema: z<BrowserNotificationSettings> = z.object({
  [BROWSER_NOTIFICATION_ENABLED_FIELD]: z.boolean().default(false),
})
