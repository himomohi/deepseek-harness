/** Browser API adapter used by the notification controller and its tests. */

/** Notification permission values exposed by the browser API. */
export type BrowserNotificationPermission = 'default' | 'denied' | 'granted'

/** Input needed to display one browser notification. */
export interface BrowserNotificationInput {
  /** Notification heading. */
  title: string
  /** Notification detail. */
  body: string
  /** Action invoked when the user clicks the notification. */
  onClick: () => void
}

/** Handle returned for a displayed browser notification. */
export interface BrowserNotificationHandle {
  /** Close the displayed notification. */
  close(): void
}

/** Browser capabilities consumed by the notification controller. */
export interface BrowserNotificationEnvironment {
  /** @returns whether the Notifications API exists. */
  isSupported(): boolean
  /** @returns the current browser permission. */
  getPermission(): BrowserNotificationPermission
  /** @returns the permission selected after a user-initiated prompt. */
  requestPermission(): Promise<BrowserNotificationPermission>
  /**
   * Display one notification.
   * @param input - localized notification content and click action.
   * @returns a close handle.
   */
  notify(input: BrowserNotificationInput): BrowserNotificationHandle
  /** @returns whether the page is both visible and focused. */
  isPageActive(): boolean
  /** Bring the browser window to the foreground when permitted. */
  focusPage(): void
}

/**
 * Create the production adapter over window, document, and Notification.
 * @returns the browser-notification environment.
 */
export function createBrowserNotificationEnvironment(): BrowserNotificationEnvironment {
  return {
    isSupported: () => 'Notification' in globalThis,
    getPermission: () => Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    notify: (input) => {
      const notification = new Notification(input.title, { body: input.body })
      notification.onclick = () => { input.onClick() }
      return { close: () => { notification.close() } }
    },
    isPageActive: () => document.visibilityState === 'visible' && document.hasFocus(),
    focusPage: () => { window.focus() },
  }
}
