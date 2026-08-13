import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'tab': '플러그인 목록',
  'loading': '플러그인 읽는 중…',
  'error': '플러그인을 일시적으로 사용할 수 없습니다.',
  'retry': '다시 시도',
  'search': '플러그인 검색',
  'catalog': '플러그인 목록',
  'empty': '사용할 수 있는 플러그인이 없습니다.',
  'emptySearch': '일치하는 플러그인이 없습니다.',
  'enabledTag': '활성화됨',
  'disabledTag': '사용 중지됨',
  'configuration': '구성',
  'cordis': 'Cordis 상태',
  'unobserved': '마운트되지 않음',
  'pending': '종속성 대기 중',
  'loadingPhase': '로딩 중',
  'active': '마운트됨',
  'failed': '마운트 실패',
  'unloading': '언로드 중',
} satisfies Record<keyof typeof en, string>
