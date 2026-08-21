# @deepseek-ai/dsh-client-locale

[English](README.md) | 中文

locale 插件：LocaleRuntime——所选 locale id 以 `locale.preference` 存储在 `$DSH_HOME/settings.yaml` 中；若没有显式 Host 值，全新浏览器会暂时使用 `navigator` 请求且已注册的第一种语言（按主子标签匹配，以 `zh` 为回退）。语言包插件通过 `registerLocale` 添加可选 locale，并通过单 locale 的 `register` 重载注册命名空间字典。等待语言包的已存储偏好或浏览器偏好会在该 locale 注册时生效。Host 读取在插件激活后执行，因此 settings 服务不可用不会阻塞页面。settings API 仅限回环请求，因此远程浏览器的选择仅保留在进程内。`locale/change` 仅在切换语言时触发。该服务还拥有 ns×locale 字典注册表（基础字典使用 `register(ns, {zh, en})`，`bind(ns)`→`TranslateNS<ns>`；查找链 ns → common → zh → key），实现 slot 系统的 `LocaleFace`，并经 `ctx.slots.installLocale` 自行安装，支撑框架注入的 `t` 标准席位。该持久化边界由[Host settings 支撑的偏好决策](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.zh.md)拥有。

## 模型体验

无。locale 注册表为浏览器 UI 文案提供服务；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **部分界面仍保留内联文案**——设置行、侧边栏、问题作答器和模型选择使用 locale seat；其他包仍直接拥有静态文本。
- **注册表持有的文本只读取一次翻译**——在 slot 渲染路径之外于注册时捕获的文案（例如 command 注册表中的 `/model` 命令描述）在重新注册前保持注册时的语言；slot 渲染的文案随切换实时更新。
