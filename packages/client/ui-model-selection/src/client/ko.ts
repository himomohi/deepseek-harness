import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'command.description': '이 대화를 위한 모델을 선택하세요',
  'option.loadError': '카탈로그를 불러오지 못했습니다: {message}',
  'trigger.fallback': '모델 선택',
  'trigger.selectAria': '모델 선택',
  'trigger.aria': '모델 선택, 현재 {model}',
  'trigger.ariaEffort': '모델 선택, 현재 {model}, 추론 수준 {effort}',
  'menu.aria': '모델 및 추론 수준',
  'menu.model': '모델',
  'menu.effort': '추론 수준',
  'effort.providerDefault': '기본값',
  'status.loading': '모델 목록을 새로고침 중…',
  'error.action': '모델 변경 실패: {message}',
  'action.reload': '새로 고침',
  'warning.groupLoad': '{name}를 불러오는 데 실패했습니다: {message}',
  'empty.models': '사용 가능한 모델이 없습니다.',
  'blocked.composer': '이 모델은 사용할 수 없습니다 — 계속하려면 하나를 선택하세요',
  'empty.efforts': '이 모델은 추론 수준을 제공하지 않습니다.',
} satisfies Record<keyof typeof en, string>
