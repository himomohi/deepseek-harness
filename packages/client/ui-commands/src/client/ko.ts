import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'search.placeholder': '검색…',
  'search.aria': '필터 옵션',
  'status.loading': '옵션 로딩 중…',
  'status.applying': '적용 중…',
  'status.empty': '옵션 없음',
  'overlay.aria': '/{command} 옵션',
  'listbox.aria': '/{command} 매치',
} satisfies Record<keyof typeof en, string>
