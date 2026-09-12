import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionPendingInteraction, SessionPendingInteractionSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
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

function question(key: string): SessionPendingInteraction {
  return { kind: 'question', key, sessionId: id } as unknown as SessionPendingInteraction
}

function pendingSnapshot(entries: readonly SessionPendingInteraction[]): SessionPendingInteractionSnapshot {
  return new Map(entries.map(entry => [entry.sessionId, entry]))
}

function bench(initial = list([summary()]), initialPending = pendingSnapshot([])) {
  const settings = stubSettingsScope<BrowserNotificationSettings>()
  settings.publish({
    status: 'ready',
    value: { enabled: true },
    writable: true,
    revision: 0,
  })
  const sessions = createSnapshotStore(initial)
  const pending = createSnapshotStore<SessionPendingInteractionSnapshot>(initialPending)
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
    pendingInteractions: pending,
    environment,
    translate: (key, params) => params === undefined ? key : `${key}:${params.name}`,
  })
  const dispose = controller.start()
  return { settings, sessions, pending, notifications, close, environment, open, controller, dispose }
}

describe('BrowserNotificationController', () => {
  it('uses the first snapshot as a quiet baseline, then notifies question and completion transitions', () => {
    const b = bench(list([summary()]), pendingSnapshot([question('q0')]))
    expect(b.notifications).toHaveLength(0)

    b.pending.set(pendingSnapshot([]))
    b.pending.set(pendingSnapshot([question('q1')]))
    expect(b.notifications).toHaveLength(1)
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
    b.pending.set(pendingSnapshot([question('q1')]))
    expect(b.notifications).toHaveLength(1)

    vi.mocked(b.environment.isPageActive).mockReturnValue(true)
    b.pending.set(pendingSnapshot([]))
    b.pending.set(pendingSnapshot([question('q2')]))
    expect(b.notifications).toHaveLength(1)

    b.settings.publish({ value: { enabled: false } })
    vi.mocked(b.environment.isPageActive).mockReturnValue(false)
    b.pending.set(pendingSnapshot([]))
    b.pending.set(pendingSnapshot([question('q3')]))
    expect(b.notifications).toHaveLength(1)
  })

  it('suppresses unsupported and ungranted browser notification APIs', () => {
    const b = bench()
    vi.mocked(b.environment.isSupported).mockReturnValue(false)
    b.pending.set(pendingSnapshot([question('q1')]))
    expect(b.notifications).toHaveLength(0)

    b.pending.set(pendingSnapshot([]))
    vi.mocked(b.environment.isSupported).mockReturnValue(true)
    vi.mocked(b.environment.getPermission).mockReturnValue('default')
    b.pending.set(pendingSnapshot([question('q2')]))
    expect(b.notifications).toHaveLength(0)
  })

  it('notifies a question without a ready session list and does not open a removed session', () => {
    const b = bench(list([], 'pending'))
    b.pending.set(pendingSnapshot([question('q1')]))
    expect(b.notifications).toHaveLength(1)
    b.sessions.set(list([]))
    b.notifications[0]!.onClick()
    expect(b.open).not.toHaveBeenCalled()
  })
})
