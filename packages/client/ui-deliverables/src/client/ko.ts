import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'produced.label': '생성된 파일',
  'produced.moreOne': '+ 1개 파일',
  'produced.more': '+ {count} 파일',
  'produced.open': '{name} 열기',
  'produced.showInFolder': '폴더에서 보기',
} satisfies Record<keyof typeof en, string>
