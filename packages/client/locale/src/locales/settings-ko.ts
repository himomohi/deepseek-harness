import type { en } from './settings.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'language.title': '언어',
} satisfies Record<keyof typeof en, string>
