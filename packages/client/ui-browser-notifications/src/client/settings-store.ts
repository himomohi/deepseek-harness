/** General-settings row state for the browser-notification plugin. */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** Browser-notification settings-row availability. */
export type BrowserNotificationStatus =
  | 'loading'
  | 'ready'
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'error'

/** State rendered by the General settings row. */
export interface BrowserNotificationRowState {
  /** Accepted durable opt-in. */
  enabled: boolean
  /** Whether a settings or permission operation is pending. */
  saving: boolean
  /** Whether the Host settings document accepts writes. */
  writable: boolean
  /** Current browser/settings availability. */
  status: BrowserNotificationStatus
}

/** Store actions exposed to the controller. */
export type BrowserNotificationRowActions = {
  sync: (draft: BrowserNotificationRowState, next: BrowserNotificationRowState) => void
}

/**
 * Declare the browser-notification row state.
 * @returns the store handle.
 */
export function createBrowserNotificationRowStore():
EngineStoreHandle<BrowserNotificationRowState, BrowserNotificationRowActions> {
  return defineStore({
    init: (): BrowserNotificationRowState => ({
      enabled: false,
      saving: false,
      writable: false,
      status: 'loading',
    }),
    actions: {
      sync: (draft, next) => {
        draft.enabled = next.enabled
        draft.saving = next.saving
        draft.writable = next.writable
        draft.status = next.status
      },
    },
  })
}
