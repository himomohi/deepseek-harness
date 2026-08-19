# @deepseek-ai/dsh-client-ui-browser-notifications

[English](README.md) | 中文

这是一个可选择启用的浏览器通知插件。当 Web 页面被隐藏或失去焦点时，如果会话需要用户回答，或一次回复已经结束，插件会发送通知。浏览器插件观察共享的会话列表摘要：进入 `pendingInteraction: question` 时发送提问通知，`running: true` 变为 `running: false` 时发送完成通知。首次就绪的会话列表只用作基线，因此打开或刷新页面不会重放已有状态的通知。

通用设置行拥有 `ui-browser-notifications.enabled` 偏好。只有用户启用该设置时才会请求浏览器通知权限。权限被拒绝后，插件会显示浏览器控制的状态，不会自动重复请求。点击通知会聚焦窗口，并在来源会话仍存在时打开该会话。

Host 侧要求 settings 服务，并在浏览器客户端连接前注册 schema。远程或 memory 模式浏览器会把该偏好显示为不可用。Web bundle 默认包含此插件。

## 模型体验

无，因为通知只观察浏览器会话摘要，不会进入模型输入或 transcript 输出。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- 浏览器与操作系统的通知策略始终具有最终决定权。用户代理可能限制窗口聚焦或通知显示。
- “完成”表示观察到的运行中 turn 已停止；通知不区分成功回复与终止错误。
