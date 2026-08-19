/** Notification permission, settings, and session-transition controller. */

import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type {
  ISessions,
  SessionListState,
  SessionSummary,
  SettingsScope,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  BROWSER_NOTIFICATION_ENABLED_FIELD,
  type BrowserNotificationSettings,
} from '../settings.ts'
import type { BrowserNotificationKey } from './locales.ts'
import type { BrowserNotificationEnvironment } from './environment.ts'
import type {
  BrowserNotificationRowState,
} from './settings-store.ts'

/** Translator face used for settings and notification copy. */
export type BrowserNotificationTranslate =
  (key: BrowserNotificationKey, params?: Record<string, string>) => string

/** Controller dependencies. */
export interface BrowserNotificationControllerOptions {
  /** Durable settings scope. */
  settings: SettingsScope<BrowserNotificationSettings>
  /** Session list and navigation face. */
  sessions: Pick<ISessions, 'list' | 'open'>
  /** Browser API adapter. */
  environment: BrowserNotificationEnvironment
  /** Live locale translator. */
  translate: BrowserNotificationTranslate
}

/** Instantiated row-store action face consumed by the controller. */
export interface BrowserNotificationRowActionFace {
  /**
   * Replace the rendered row state.
   * @param next - current controller state.
   */
  sync(next: BrowserNotificationRowState): void
}

/**
 * Own browser permission requests and detect question/completion transitions.
 * Permission prompts occur only in {@link setEnabled}.
 */
export class BrowserNotificationController {
  private readonly settings: SettingsScope<BrowserNotificationSettings>
  private readonly sessions: Pick<ISessions, 'list' | 'open'>
  private readonly environment: BrowserNotificationEnvironment
  private readonly translate: BrowserNotificationTranslate
  private previous = new Map<SessionId, SessionSummary>()
  private primed = false
  private actions: BrowserNotificationRowActionFace | undefined
  private state: BrowserNotificationRowState = {
    enabled: false,
    saving: false,
    writable: false,
    status: 'loading',
  }

  /**
   * @param options - settings, sessions, browser API, and localized copy.
   */
  constructor(options: BrowserNotificationControllerOptions) {
    this.settings = options.settings
    this.sessions = options.sessions
    this.environment = options.environment
    this.translate = options.translate
  }

  /**
   * Bind the settings-row action face and immediately publish current state.
   * @param actions - instantiated slot-store actions.
   */
  bind(actions: BrowserNotificationRowActionFace): void {
    this.actions = actions
    actions.sync(this.state)
  }

  /**
   * Subscribe to settings and session snapshots.
   * @returns disposer for both subscriptions.
   */
  start(): () => void {
    this.syncSettings()
    this.syncSessions()
    const offSettings = this.settings.subscribe(() => { this.syncSettings() })
    const offSessions = this.sessions.list.subscribe(() => { this.syncSessions() })
    return () => {
      offSettings()
      offSessions()
    }
  }

  /**
   * Apply a direct user choice. Enabling may open the browser permission
   * prompt; background synchronization never requests permission.
   * @param enabled - requested opt-in.
   * @returns completion after the Host accepts or rejects the setting.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    if (this.state.saving) return
    if (!this.environment.isSupported()) {
      this.publish({ status: 'unsupported' })
      return
    }
    if (!this.settings.getSnapshot().writable) {
      this.publish({ status: 'unavailable' })
      return
    }

    this.publish({ saving: true })
    try {
      if (enabled) {
        let permission = this.environment.getPermission()
        if (permission === 'default') permission = await this.environment.requestPermission()
        if (permission !== 'granted') {
          this.publish({ saving: false, status: 'denied' })
          return
        }
      }
      await this.settings.set(BROWSER_NOTIFICATION_ENABLED_FIELD, enabled)
      this.publish({ saving: false })
    } catch {
      this.publish({ saving: false, status: 'error' })
    }
  }

  private publish(next: Partial<BrowserNotificationRowState>): void {
    this.state = { ...this.state, ...next }
    this.actions?.sync(this.state)
  }

  private syncSettings(): void {
    const snapshot = this.settings.getSnapshot()
    let status: BrowserNotificationRowState['status']
    if (!this.environment.isSupported()) status = 'unsupported'
    else if (snapshot.status === 'loading') status = 'loading'
    else if (snapshot.status === 'unavailable') status = 'unavailable'
    else if (this.environment.getPermission() === 'denied') status = 'denied'
    else status = 'ready'
    this.publish({
      enabled: snapshot.value?.enabled ?? false,
      writable: snapshot.writable,
      status,
    })
  }

  private syncSessions(): void {
    const snapshot = this.sessions.list.getSnapshot()
    if (snapshot.phase !== 'ready') return
    const next = new Map<SessionId, SessionSummary>()
    for (const id of snapshot.ids) {
      const summary = snapshot.byId[id]
      if (summary !== undefined) next.set(id, summary)
    }

    if (!this.primed) {
      this.previous = next
      this.primed = true
      return
    }

    for (const [id, summary] of next) {
      const prior = this.previous.get(id)
      if (summary.pendingInteraction === 'question'
        && prior?.pendingInteraction !== 'question') {
        this.show('question', id, summary)
      } else if (prior?.running === true && summary.running === false) {
        this.show('complete', id, summary)
      }
    }
    this.previous = next
  }

  private show(
    kind: 'question' | 'complete',
    sessionId: SessionId,
    summary: SessionSummary,
  ): void {
    if (!this.state.enabled) return
    if (!this.environment.isSupported()) return
    if (this.environment.getPermission() !== 'granted') return
    if (this.environment.isPageActive()) return

    const displayed: { handle?: { close(): void } } = {}
    displayed.handle = this.environment.notify({
      title: this.translate(`notification.${kind}.title`),
      body: this.translate(`notification.${kind}.body`, { name: summary.displayTitle }),
      onClick: () => {
        this.environment.focusPage()
        const current: SessionListState = this.sessions.list.getSnapshot()
        if (current.byId[sessionId] !== undefined) this.sessions.open(sessionId)
        displayed.handle?.close()
      },
    })
  }
}
