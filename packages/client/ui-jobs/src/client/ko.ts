import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'count.live.one': '{count} 백그라운드 작업 실행 중',
  'count.live.other': '{count} 백그라운드 작업 실행 중',
  'count.idle.one': '{count} 백그라운드 작업',
  'count.idle.other': '{count} 백그라운드 작업',
  'list.aria': '백그라운드 작업',
  'status.running': '실행 중',
  'status.stopping': '중지 중',
  'status.completed': '완료',
  'status.killed': '취소됨',
  'status.failed': '실패',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': '{duration} 동안 실행 중',
  'duration.title.done': '{duration} 소요',
} satisfies Record<keyof typeof en, string>
