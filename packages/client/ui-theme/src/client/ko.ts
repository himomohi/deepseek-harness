import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'appearance.title': '테마',
  'appearance.light': '라이트',
  'appearance.dark': '다크',
  'appearance.system': '시스템',
} satisfies Record<keyof typeof en, string>
