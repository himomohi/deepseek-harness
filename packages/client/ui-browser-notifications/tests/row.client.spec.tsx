// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  createSnapshotStore,
  type SessionListState,
  type WorkspaceListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { BrowserNotificationsRow } from '../src/client/BrowserNotificationsRow.tsx'
import type { BrowserNotificationsRowProps } from '../src/client/BrowserNotificationsRow.tsx'
import { createBrowserNotificationRowStore } from '../src/client/settings-store.ts'

afterEach(cleanup)

function emptySessions() {
  return bindSnapshotSelector(createSnapshotStore<SessionListState>({
    ids: [],
    byId: {},
    current: undefined,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }))
}

function emptyWorkspaces() {
  return bindSnapshotSelector(createSnapshotStore<WorkspaceListState>({
    items: [],
    archivedSessionIds: [],
    state: 'idle',
    phase: 'ready',
    error: null,
    baselinesReady: true,
    recentWorkspaceId: undefined,
  }))
}

function mount() {
  const store = createBrowserNotificationRowStore().create()
  const setEnabled = vi.fn()
  const props: BrowserNotificationsRowProps = {
    useSessions: emptySessions(),
    useWorkspaces: emptyWorkspaces(),
    useStore: bindSnapshotSelector(store),
    actions: store.actions,
    t: key => key,
    setEnabled,
  }
  render(<BrowserNotificationsRow {...props} />)
  return { store, setEnabled }
}

describe('BrowserNotificationsRow', () => {
  it('renders the persisted switch and routes user choices', () => {
    const b = mount()
    act(() => {
      b.store.actions.sync({ enabled: true, saving: false, writable: true, status: 'ready' })
    })
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(toggle)
    expect(b.setEnabled).toHaveBeenCalledWith(false)
  })

  it('explains blocked permission and disables a new opt-in', () => {
    const b = mount()
    act(() => {
      b.store.actions.sync({ enabled: false, saving: false, writable: true, status: 'denied' })
    })
    expect(screen.getByRole('status').textContent).toBe('status.denied')
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true)
  })

  it.each([
    ['unsupported', 'status.unsupported'],
    ['unavailable', 'status.unavailable'],
    ['error', 'status.error'],
  ] as const)('renders the %s availability message', (status, message) => {
    const mounted = mount()
    act(() => {
      mounted.store.actions.sync({
        enabled: false,
        saving: false,
        writable: true,
        status,
      })
    })
    expect(screen.getByRole('status').textContent).toBe(message)
  })
})
