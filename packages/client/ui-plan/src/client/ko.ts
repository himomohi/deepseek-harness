import type { en } from './locales.ts'

/** Korean dictionary, checked complete against the English key set. */
export const ko = {
  'chip.on.aria': '계획 모드 켬, 끄려면 누르세요',
  'chip.on.title': '계획 모드 켬 — 클릭하여 끄기 (/plan 끔)',
  'chip.off.aria': '계획 모드 꺼짐, 켜려면 누르세요',
  'chip.off.title': '계획 모드 꺼짐 — 클릭하여 켜기 (/plan)',
} satisfies Record<keyof typeof en, string>
