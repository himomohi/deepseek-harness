/** Korean browser-notification dictionary. */
export const ko = {
  'title': '브라우저 알림',
  'description': '이 페이지가 백그라운드에 있을 때 답변이 필요한 질문이나 응답 완료를 알려줍니다.',
  'enable': '브라우저 알림 켜기',
  'disable': '브라우저 알림 끄기',
  'status.unsupported': '이 브라우저는 알림을 지원하지 않습니다.',
  'status.denied': '알림이 차단되었습니다. 브라우저의 사이트 권한에서 알림을 허용해 주세요.',
  'status.unavailable': '현재 연결에서는 이 설정을 저장할 수 없습니다.',
  'status.error': '알림 설정을 업데이트하지 못했습니다.',
  'notification.question.title': '답변이 필요합니다',
  'notification.question.body': '{name} 세션이 답변을 기다리고 있습니다.',
  'notification.complete.title': '응답이 완료되었습니다',
  'notification.complete.body': '{name} 세션의 응답이 완료되었습니다.',
} satisfies Record<string, string>
