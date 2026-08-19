# Agent Note: 退役专用 OpenCodex 提供方插件

Status: implemented

[English](2026-08-19-retire-dedicated-opencodex-plugin.md) | 中文

## Problem

`@deepseek-ai/dsh-llm-opencodex` 存在的原因，是本分支需要在 OpenCodex 能自行承载 DeepSeek Harness 之前连接本地代理。该包会再注册一条 `opencodex` 路由、一张插件设置卡片，以及一个 `dsh update` 标记。受维护的 Web 配置已经禁用该行，因为 `llm-pi-ai.providers.opencodex` 拥有同一条路由。同时保留两者，会让每次上游合并都去处理产品组合并未运行的提供方。

## Decision

删除该专用包、其基础组合行、插件设置中的 OpenCodex 卡片，以及 `llm-opencodex` 更新标记。OpenCodex 仍作为官方 `llm-pi-ai` 路径上的模型页提供方：一个名为 `opencodex` 的配置文件，带有代理基址和凭据。实时 `GET /models` 同步保留在该提供方 id 上，而不是私有设置 namespace。

共享的 DeepSeek 直接 chat-completions 运行时只继续服务于官方 DeepSeek 适配器。

## Alternatives considered

**在每个配置中禁用该包。** 否决，因为 `dsh update` 仍会把它当作分支自有标记，合并冲突也会继续落到未运行的提供方代码上。

**把专用适配器改成单独发布的插件。** 否决，因为 OpenCodex 现在已经提供面向 DSH 的集成；第二个适配器仍会重复注册 `opencodex` 路由。

## Consequences

列出 `@deepseek-ai/dsh-llm-opencodex` 的组合必须改为 `llm-pi-ai` 的 OpenCodex 提供方，否则无法解析该包。本分支不再承诺私有的 chat-completions OpenCodex 适配器、纯文本传输策略或插件卡片端点编辑器。输出限制和发现行为跟随 `llm-pi-ai`。

## Related decisions

[共享直接 chat-completions 运行时](../architecture/2026-08-15-shared-direct-chat-completions-runtime.md) 仍拥有 DeepSeek 直接适配器。它早先否决 pi-ai OpenCodex 路径，是因为当时 OpenCodex 还没有 DSH 集成。

[保持公开分支 README 为当前且可验证的说明](../process/2026-08-16-public-fork-readme-accuracy.md) 只能把 OpenCodex 列为模型页提供方，而不能列为分支自有包。
