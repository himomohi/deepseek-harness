// @vitest-environment jsdom
/**
 * Test suite for VisionFallbackCard settings component.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VisionFallbackCard, type VisionFallbackCardProps } from '../src/client/VisionFallbackCard.tsx'
import { en } from '../src/client/locales.ts'

function mockT(key: keyof typeof en): string {
  return en[key] ?? key
}

describe('VisionFallbackCard', () => {
  afterEach(() => {
    cleanup()
  })
  it('renders correctly in auto mode by default', async () => {
    const mockApi = {
      settings: {
        describe: vi.fn().mockResolvedValue({
          result: {
            ok: true,
            value: {
              writable: true,
              hasDocument: true,
              namespaces: [
                { ns: 'vision-fallback', value: { enabled: true, maxTokens: 2048 }, user: {}, base: {}, revision: 1 },
              ],
            },
          },
        }),
        mutate: vi.fn().mockResolvedValue({ result: { ok: true } }),
      },
    }

    render(<VisionFallbackCard api={mockApi as unknown as VisionFallbackCardProps['api']} t={mockT} />)

    expect(screen.getByText(en.visionFallbackIntro)).toBeDefined()
    expect(screen.getByText(en.visionFallbackModeAuto)).toBeDefined()
    expect(screen.getByText(en.visionFallbackModeCustom)).toBeDefined()

    await waitFor(() => {
      expect(mockApi.settings.describe).toHaveBeenCalled()
    })
  })

  it('allows switching to custom mode and saving custom provider and model', async () => {
    const mockApi = {
      settings: {
        describe: vi.fn().mockResolvedValue({
          result: {
            ok: true,
            value: {
              writable: true,
              hasDocument: true,
              namespaces: [
                { ns: 'vision-fallback', value: { enabled: true }, user: {}, base: {}, revision: 1 },
              ],
            },
          },
        }),
        mutate: vi.fn().mockResolvedValue({ result: { ok: true } }),
      },
    }

    render(<VisionFallbackCard api={mockApi as unknown as VisionFallbackCardProps['api']} t={mockT} />)

    // Switch to Custom mode
    const customRadio = screen.getByLabelText(en.visionFallbackModeCustom)
    fireEvent.click(customRadio)

    expect(screen.getByText(en.visionFallbackProvider)).toBeDefined()
    expect(screen.getByText(en.visionFallbackModel)).toBeDefined()

    // Click Save
    const saveButton = screen.getByText(en.visionFallbackSave)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockApi.settings.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          ns: 'vision-fallback',
          ops: [
            expect.objectContaining({
              op: 'set',
              value: expect.objectContaining({
                enabled: true,
                fallbackProvider: 'opencodex',
                fallbackModel: 'gpt-5.6-sol',
              }),
            }),
          ],
        }),
      )
    })
  })

  it('allows toggling vision fallback off', async () => {
    const mockApi = {
      settings: {
        describe: vi.fn().mockResolvedValue({
          result: {
            ok: true,
            value: {
              writable: true,
              hasDocument: true,
              namespaces: [
                { ns: 'vision-fallback', value: { enabled: true }, user: {}, base: {}, revision: 1 },
              ],
            },
          },
        }),
        mutate: vi.fn().mockResolvedValue({ result: { ok: true } }),
      },
    }

    render(<VisionFallbackCard api={mockApi as unknown as VisionFallbackCardProps['api']} t={mockT} />)

    const switchBtn = screen.getByRole('switch')
    expect(switchBtn.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(switchBtn)
    expect(switchBtn.getAttribute('aria-checked')).toBe('false')
  })
})
