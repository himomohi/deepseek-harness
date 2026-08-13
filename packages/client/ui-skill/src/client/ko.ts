import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'row.running': '스킬 로딩 중',
  'row.failed': '스킬 로드 실패',
  'row.stopped': '스킬 로드가 중지되었습니다',
  'row.instructions': '지침',
  'menu.userOnly': '사용자 전용',
} satisfies Record<keyof typeof en, string>
