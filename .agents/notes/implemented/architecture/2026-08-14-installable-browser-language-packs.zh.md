# Agent Note: 可安装的浏览器语言包

Status: implemented

[English](2026-08-14-installable-browser-language-packs.md) | 中文

## Problem

locale 注册表原先把所有随产品发布的语言视为基础包拥有的封闭集合。增加一种语言需要同时修改 locale 偏好 schema 和每个功能的字典注册，因此翻译无法独立安装、更新或移除。

## Decision

`LocaleRuntime.registerLocale` 是可选浏览器 locale 的公开注册入口。基础包拥有 `zh` 和 `en`；语言包插件拥有其他 locale 定义，并使用现有的单 locale 字典注册为各命名空间提供字典。

持久化偏好使用字符串，因为 Host settings 读取可能早于对应浏览器插件。LocaleRuntime 在语言包尚未注册时忽略不可用的已存储 id，并在注册后激活它。浏览器语言偏好遵循相同的延迟注册规则。

`@deepseek-ai/dsh-client-locale-ko` 以带有 DSH bundle patch 的双端 client 包拥有韩语定义和字典。Web bundle 默认包含此包，其他 profile 可以通过 `dsh plugin` 添加或更新它。

## Alternatives considered

**把韩语保留在基础 locale 包中。** 这样可以提供韩语，但仍保留封闭 locale 集合，并要求所有字典所有者协调修改。

**由外部插件修改 LocaleRuntime 内部状态。** 这种方式可以支持旧版预发布版本的树外包，但私有字段和 settings 校验使其依赖具体版本。仓库改为提供明确的注册 API。

## Consequences

语言包可以按独立的包发布节奏更新，无需重写全局 DSH 安装。重复的 locale id 和重复的命名空间-locale 位置会在激活期间失败。Host schema 接受浏览器插件尚不存在的 id，因此 LocaleRuntime 仍是判断已存储 locale 当前是否可选的权威。

聚焦的 locale 与韩语语言包测试固定了浏览器和 Host 偏好的延迟采用、注册释放、字典查找及重复拒绝行为。韩语浏览器快照固定了组装后的 Web bundle。
