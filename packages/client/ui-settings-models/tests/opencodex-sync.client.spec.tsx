// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModelListEditor } from '../src/client/ModelListEditor.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => { cleanup() })

describe('OpenCodex catalog sync', () => {
  it('replaces the whole catalog from the provider list', async () => {
    const onChange = vi.fn()
    const discoverModels = vi.fn(async () => ({
      result: { ok: true as const, value: { models: [
        { id: 'fresh-a', name: 'A', contextWindow: 1000 },
        { id: 'fresh-b', name: 'B', maxTokens: 200 },
      ] } },
    }))
    render(
      <ModelListEditor
        models={[{ id: 'stale', contextWindow: 111 }]}
        onChange={onChange}
        probe={{ settingsNs: 'llm-opencodex', provider: 'opencodex', baseURL: 'http://127.0.0.1:10100/v1' }}
        api={{ llm: { discoverModels } } as never}
        t={key => en[key]}
        disabled={false}
      />,
    )
    fireEvent.click(screen.getByText(en.syncModels))
    await waitFor(() => { expect(onChange).toHaveBeenCalled() })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'fresh-a', name: 'A', contextWindow: 1000 },
      { id: 'fresh-b', name: 'B', maxTokens: 200 },
    ])
    expect(screen.queryByText(en.fetchTitle)).toBeNull()
  })
})
