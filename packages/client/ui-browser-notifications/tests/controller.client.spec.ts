import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import {
  createSnapshotStore,
  type SessionListState,
  type SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import {
  BrowserNotificationController,
  type BrowserNotificationEnvironment,
  type BrowserNotificationInput,
} from '../src/client/index.ts'
import type { BrowserNotificationSettings } from '../src/settings.ts'

const id = 'session-1' as SessionId

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id,
    displayTitle: 'Research',
    running: true,
    blank: false,
    updatedAt: 1,
    ...overrides,
  }
}

function list(rows: readonly SessionSummary[], phase: SessionListState['phase'] = 'ready'):
SessionListState {
  return {
    ids: rows.map(row => row.id),
    byId: Object.fromEntries(rows.map(row => [row.id, row])) as SessionListState['byId'],
    current: undefined,
    phase,
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function bench(initial = list([summary()])) {
  const settings = stubSettingsScope<BrowserNotificationSettings>()
  settings.publish({
    status: 'ready',
    value: { enabled: true },
    writable: true,
    revision: 0,
  })
  const sessions = createSnapshotStore(initial)
  const notifications: BrowserNotificationInput[] = []
  const close = vi.fn()
  const environment: BrowserNotificationEnvironment = {
    isSupported: vi.fn(() => true),
    getPermission: vi.fn((): 'granted' => 'granted'),
    requestPermission: vi.fn(() => Promise.resolve<'granted'>('granted')),
    notify: vi.fn((input) => {
      notifications.push(input)
      return { close }
    }),
    isPageActive: vi.fn(() => false),
    focusPage: vi.fn(),
  }
  const open = vi.fn()
  const controller = new BrowserNotificationController({
    settings: settings.scope,
    sessions: { list: sessions, open },
    environment,
    translate: (key, params) => params === undefined ? key : `${key}:${params.name}`,
  })
  const dispose = controller.start()
  return { settings, sessions, notifications, close, environment, open, controller, dispose }
}

describe('BrowserNotificationController', () => {
  it('uses the first ready list as a quiet baseline, then notifies question and completion transitions', () => {
    const b = bench(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications).toHaveLength(0)

    b.sessions.set(list([summary()]))
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications[0]).toMatchObject({
      title: 'notification.question.title',
      body: 'notification.question.body:Research',
    })
    b.notifications[0]!.onClick()
    expect(b.environment.focusPage).toHaveBeenCalledOnce()
    expect(b.open).toHaveBeenCalledWith(id)
    expect(b.close).toHaveBeenCalledOnce()

    b.sessions.set(list([summary({ running: false })]))
    expect(b.notifications[1]).toMatchObject({
      title: 'notification.complete.title',
      body: 'notification.complete.body:Research',
    })
    b.dispose()
    expect(b.settings.listenerCount()).toBe(0)
  })

  it('notifies a newly discovered waiting session but suppresses active-page and disabled states', () => {
    const b = bench(list([]))
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications).toHaveLength(1)

    vi.mocked(b.environment.isPageActive).mockReturnValue(true)
    b.sessions.set(list([summary()]))
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications).toHaveLength(1)

    b.settings.publish({ value: { enabled: false } })
    vi.mocked(b.environment.isPageActive).mockReturnValue(false)
    b.sessions.set(list([summary()]))
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications).toHaveLength(1)
  })

  it('suppresses unsupported and ungranted browser notification APIs', () => {
    const b = bench()
    vi.mocked(b.environment.isSupported).mockReturnValue(false)
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications).toHaveLength(0)

    b.sessions.set(list([summary()]))
    vi.mocked(b.environment.isSupported).mockReturnValue(true)
    vi.mocked(b.environment.getPermission).mockReturnValue('default')
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.notifications).toHaveLength(0)
  })

  it('waits for the first ready baseline and does not open a removed session', () => {
    const b = bench(list([], 'pending'))
    b.sessions.set(list([summary({ pendingInteraction: 'question' })], 'ready'))
    expect(b.notifications).toHaveLength(0)
    b.sessions.set(list([summary()]))
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    b.sessions.set(list([]))
    b.notifications[0]!.onClick()
    expect(b.open).not.toHaveBeenCalled()
  })

  it('ignores a missing summary referenced by the session id list', () => {
    const b = bench(list([]))
    b.sessions.set({
      ...list([]),
      ids: [id],
      byId: {},
    })
    expect(b.notifications).toHaveLength(0)
  })

  it('requests permission only from an explicit enable action and persists granted choices', async () => {
    const b = bench()
    b.settings.publish({ value: { enabled: false } })
    vi.mocked(b.environment.getPermission).mockReturnValue('default')
    await b.controller.setEnabled(true)
    expect(b.environment.requestPermission).toHaveBeenCalledOnce()
    expect(b.settings.set).toHaveBeenCalledWith('enabled', true)

    vi.mocked(b.environment.getPermission).mockReturnValue('granted')
    await b.controller.setEnabled(false)
    expect(b.settings.set).toHaveBeenLastCalledWith('enabled', false)
  })

  it('ignores a second setting choice while the first write is pending', async () => {
    const b = bench()
    let release: (() => void) | undefined
    b.settings.set.mockImplementationOnce(() => new Promise<void>((resolve) => {
      release = resolve
    }))
    const first = b.controller.setEnabled(false)
    await b.controller.setEnabled(true)
    expect(b.settings.set).toHaveBeenCalledOnce()
    release?.()
    await first
  })

  it('synchronizes every browser and settings availability state', () => {
    const b = bench()
    const sync = vi.fn()
    b.controller.bind({ sync })

    vi.mocked(b.environment.isSupported).mockReturnValue(false)
    b.settings.publish({})
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unsupported' }))

    vi.mocked(b.environment.isSupported).mockReturnValue(true)
    b.settings.publish({ status: 'loading' })
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'loading' }))

    b.settings.publish({ status: 'unavailable' })
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unavailable' }))

    vi.mocked(b.environment.getPermission).mockReturnValue('denied')
    b.settings.publish({ status: 'ready' })
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'denied' }))

    vi.mocked(b.environment.getPermission).mockReturnValue('granted')
    b.settings.publish({ value: undefined })
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('tolerates a notification click before the display handle is returned', () => {
    const b = bench()
    vi.mocked(b.environment.notify).mockImplementationOnce((input) => {
      input.onClick()
      return { close: vi.fn() }
    })
    b.sessions.set(list([summary({ pendingInteraction: 'question' })]))
    expect(b.open).toHaveBeenCalledWith(id)
  })

  it('reports denied, unsupported, unavailable, and failed writes without prompting in the background', async () => {
    const b = bench()
    const sync = vi.fn()
    b.controller.bind({ sync })

    vi.mocked(b.environment.getPermission).mockReturnValue('default')
    vi.mocked(b.environment.requestPermission).mockResolvedValueOnce('denied')
    await b.controller.setEnabled(true)
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'denied', saving: false }))

    vi.mocked(b.environment.isSupported).mockReturnValue(false)
    await b.controller.setEnabled(true)
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unsupported' }))

    vi.mocked(b.environment.isSupported).mockReturnValue(true)
    b.settings.publish({ writable: false })
    await b.controller.setEnabled(true)
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unavailable' }))

    b.settings.publish({ writable: true })
    vi.mocked(b.environment.getPermission).mockReturnValue('granted')
    b.settings.set.mockRejectedValueOnce(new Error('write failed'))
    await b.controller.setEnabled(true)
    expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'error', saving: false }))
  })
})
