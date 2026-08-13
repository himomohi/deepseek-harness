# 韩语语言包

[English](README.md) | 中文

`@deepseek-ai/dsh-client-locale-ko` 将韩语作为可安装的浏览器 locale 添加。它通过公开的 locale 注册表注册 `ko` locale 和韩语字典，无需修改基础 locale 包。

Web bundle 默认包含此包。未包含此包的 profile 可以单独安装：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-client-locale-ko
```

语言包是 profile bundle，因此更新 DSH 时无需修改全局安装。可以通过同一套 profile 插件流程更新或移除此包。

## 模型体验

无，因为此包只提供浏览器 UI 文案，不会添加模型可见输入。

#### KV Cache 影响

无。此包不组装或发送提供方请求。

## 已知限制与暂缓事项

- 浏览器插件依赖基础 `locale` 服务。重复注册 `ko` locale 或字典会在插件激活期间失败，不会替换其他语言包。
