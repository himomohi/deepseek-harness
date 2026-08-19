/** Browser-notification preference row for General settings. */

import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createBrowserNotificationRowStore } from './settings-store.ts'
import css from './BrowserNotificationsRow.module.css'

/** Injected settings action. */
export interface BrowserNotificationsRowInjected {
  /**
   * Change the browser-notification opt-in.
   * @param enabled - requested state.
   */
  setEnabled(enabled: boolean): void
}

/** Full browser-notification row props. */
export type BrowserNotificationsRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsStore<ReturnType<typeof createBrowserNotificationRowStore>>
  & PropsLocale<'settings.browserNotifications'>
  & BrowserNotificationsRowInjected

/**
 * Render the browser-notification opt-in and availability message.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function BrowserNotificationsRow({
  t,
  setEnabled,
  useStore,
}: BrowserNotificationsRowProps) {
  const state = useStore(value => value)
  const statusKey = state.status === 'unsupported'
    ? 'status.unsupported'
    : state.status === 'denied'
      ? 'status.denied'
      : state.status === 'unavailable'
        ? 'status.unavailable'
        : state.status === 'error'
          ? 'status.error'
          : undefined
  const disabled = state.saving
    || !state.writable
    || state.status === 'loading'
    || state.status === 'unsupported'
    || state.status === 'unavailable'
    || (state.status === 'denied' && !state.enabled)

  return (
    <div className={css.group}>
      <div className={css.copy}>
        <div className={css.title}>{t('title')}</div>
        <div className={css.description}>{t('description')}</div>
        {statusKey === undefined ? null : (
          <div className={css.status} role="status">{t(statusKey)}</div>
        )}
      </div>
      <button
        type="button"
        className={css.control}
        role="switch"
        aria-checked={state.enabled}
        aria-label={t(state.enabled ? 'disable' : 'enable')}
        disabled={disabled}
        onClick={() => { setEnabled(!state.enabled) }}
      >
        <span className={css.controlTrack} data-on={state.enabled}>
          <span className={css.controlThumb} />
        </span>
      </button>
    </div>
  )
}
