import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'command': '명령',
  'skill': '스킬',
  'subagent': '서브에이전트',
  'loading': '로딩 중…',
  'suggestions.aria': '제안 트리거',
} satisfies Record<keyof typeof en, string>
