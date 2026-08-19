// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrowserNotificationEnvironment } from '../src/client/environment.ts'

describe('browser notification environment', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('adapts notification permission, display, click, close, and page focus', async () => {
    const close = vi.fn()
    class FakeNotification {
      static permission = 'default' as NotificationPermission
      static requestPermission = vi.fn(() => Promise.resolve('granted' as NotificationPermission))
      static last: FakeNotification | undefined
      onclick: (() => void) | null = null
      constructor(readonly title: string, readonly options: NotificationOptions) {
        FakeNotification.last = this
      }
      close = close
    }
    vi.stubGlobal('Notification', FakeNotification)
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {})
    const environment = createBrowserNotificationEnvironment()

    expect(environment.isSupported()).toBe(true)
    expect(environment.getPermission()).toBe('default')
    await expect(environment.requestPermission()).resolves.toBe('granted')
    const onClick = vi.fn()
    const handle = environment.notify({ title: 'Done', body: 'Body', onClick })
    FakeNotification.last?.onclick?.()
    expect(onClick).toHaveBeenCalledOnce()
    handle.close()
    expect(close).toHaveBeenCalledOnce()
    expect(environment.isPageActive()).toBe(true)
    environment.focusPage()
    expect(focus).toHaveBeenCalledOnce()
  })
})
