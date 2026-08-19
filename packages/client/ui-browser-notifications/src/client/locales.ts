/** `settings.browserNotifications` dictionaries and notification copy. */

/** Simplified Chinese dictionary and key-set authority. */
export const zh = {
  'title': '浏览器通知',
  'description': '页面不在前台时，在需要回答问题或回复完成后通知我。',
  'enable': '启用浏览器通知',
  'disable': '关闭浏览器通知',
  'status.unsupported': '此浏览器不支持通知。',
  'status.denied': '浏览器已阻止通知。请在网站权限中允许通知。',
  'status.unavailable': '当前连接无法保存此设置。',
  'status.error': '无法更新通知设置。',
  'notification.question.title': '需要你的回答',
  'notification.question.body': '{name} 正在等待回答。',
  'notification.complete.title': '回复已完成',
  'notification.complete.body': '{name} 已完成回复。',
} satisfies Record<string, string>

/** Browser-notification locale key. */
export type BrowserNotificationKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
export const en = {
  'title': 'Browser notifications',
  'description': 'Notify me when a question needs an answer or a response finishes while this page is in the background.',
  'enable': 'Enable browser notifications',
  'disable': 'Disable browser notifications',
  'status.unsupported': 'This browser does not support notifications.',
  'status.denied': 'Notifications are blocked. Allow them in this site’s browser permissions.',
  'status.unavailable': 'This connection cannot save this setting.',
  'status.error': 'The notification setting could not be updated.',
  'notification.question.title': 'Your answer is needed',
  'notification.question.body': '{name} is waiting for your answer.',
  'notification.complete.title': 'Response complete',
  'notification.complete.body': '{name} finished responding.',
} satisfies Record<BrowserNotificationKey, string>
