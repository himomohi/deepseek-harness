// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '@deepseek-ai/dsh-client-locale-ko/client'

describe('Korean language pack', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers Korean as a selectable browser locale with feature dictionaries', async () => {
    vi.stubGlobal('navigator', { languages: ['ko-KR'], language: 'ko-KR' })
    const ctx = new Context()
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)

    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()

    expect(locale.getLocale()).toMatchObject({
      active: 'ko',
      locales: [
        { id: 'zh', label: '中文' },
        { id: 'en', label: 'English' },
        { id: 'ko', label: '한국어' },
      ],
    })
    expect(locale.bind('common' as string)('cancel')).toBe('취소')
    expect(locale.bind('conversation' as string)('placeholder.default')).toBe('에이전트에게 메시지 보내기')
    expect(locale.bind('settings.models' as string)('title')).toBe('모델')
    expect(locale.bind('settings.browserNotifications' as string)('title')).toBe('브라우저 알림')

    await fiber.dispose()
    expect(locale.getLocale().locales.map(item => item.id)).toEqual(['zh', 'en'])
    expect(locale.getLocale().active).toBe('en')
  })

  it('declares only the base locale service dependency', () => {
    expect(inject).toEqual(['locale'])
  })
})
