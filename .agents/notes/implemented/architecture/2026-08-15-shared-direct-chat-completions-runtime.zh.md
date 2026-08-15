# Agent Note: 共享直接 chat-completions 运行时

Status: implemented

[English](2026-08-15-shared-direct-chat-completions-runtime.md) | 中文

## Problem

OpenCodex 包复制了 DeepSeek 适配器、序列化器、SSE 解析器、转换器、wire 类型、配置解析、凭据生命周期和设置注册。这些副本已经分歧：OpenCodex 根据模型名称猜测图片能力，并把图片展平为元数据，而它的 invariant companion 仍声称自己属于 DeepSeek 包。仓库重复检查报告 20 个克隆，其中大部分来自这对适配器。

两条路由使用相同的 OpenAI 兼容 chat-completions 传输。真正差异只有提供方身份、默认值、凭据回退和模型发现。保留传输副本会让每个超时、错误、推理或流式修复都变成双文件决策，却没有独立协议理由。

第一版共享生命周期把官方 DeepSeek 输出默认值当成传输默认值，并向 OpenCodex 请求注入 `max_tokens: 256000`。OpenCodex 会路由输出范围不同的异构模型；复现的 `zai/glm-5.3` 请求被拒绝，因为该路由最多接受 131,072。代理的模型列表只提供 id，不提供输出上限，因此共享常量和根据上下文推导的估计值都不是权威模型元数据。

## Decision

`@deepseek-ai/dsh-llm-deepseek` 持有可复用的直接 chat-completions 适配器和 `direct-provider` 生命周期。共享生命周期按每次操作解析并校验一份配置快照，解析与其匹配的凭据，注册提供方元数据，原子替换重试事实，并绑定可选模型发现回调。

DeepSeek 与 OpenCodex 入口模块保留本地、可静态遍历的 `Config` schema 和包专属模型类型，因为文档生成要求这些声明位于所属包。它们向共享运行时提供自己的路由名、显示标签、端点变量、默认值、凭据策略和发现行为。

OpenCodex 删除复制的适配器、序列化器、解析器、转换器和 wire 类型文件。其适配器标签为 `OpenCodex Proxy`，回环部署可使用非秘密回退 Token `local-opencodex`，其 `GET /models` 解析器只保留代理实际报告的元数据。

共享生命周期接受可选的提供方专属输出默认值。官方 DeepSeek 入口提供原有的 256,000；OpenCodex 不提供该值。OpenCodex 的内置建议目录也不再包含猜测的输出上限。解析顺序依次为显式调用值、精确模型条目、显式配置的路由值。三者都不存在时，序列化会省略 `max_tokens`，由所选代理模型决定输出策略。代理发布精确的正整数 `max_output_tokens` 或 `max_tokens` 时，发现流程会保留该值。

## Alternatives considered

**保留双适配器并忽略重复。** 拒绝，因为副本已经产生行为和 invariant 漂移。忽略完整栈只会让质量检查通过，无法降低维护风险。

**新建 `llm-openai-compatible` 包。** 本次变更拒绝，因为它会重新打包官方 DeepSeek 表层，并扩大 manifest、bundle 和文档改动。共享运行时由现有直接适配器所属包导出；未来独立消费方可用真实演化压力证明拆包必要性。

**让 OpenCodex 依赖 pi-ai 适配器。** 拒绝，因为 pi-ai 持有基于库的多提供方路径，目录和协议语义不同。OpenCodex 需要与官方直接适配器相同的原始 chat-completions wire 行为。

**把所有 OpenCodex 请求限制为 131,072。** 拒绝，因为观察到的提供方范围只属于一个被路由模型，并不是 OpenCodex 全局限制。共享上限既会拒绝更大的受支持预算，也会错误表示更小的上限。

**根据上下文窗口推导输出上限。** 拒绝，因为组合上下文容量不能证明提供方允许生成的最大 Token 数。适配器只接受已报告或显式配置的输出上限。

## Consequences

传输修复现在只需为两条路由实现一次，而提供方专属配置与发现仍独立记录。应用共享运行时和共享客户端凭据控制后，源代码重复检查报告零个克隆。

包依赖图增加 `llm-opencodex` → `llm-deepseek`；project reference 和 manifest 会显式声明它。共享位置仍以当前持有者命名，因此未来第三个直接提供方可能证明应提取中立包，而不是继续扩大 DeepSeek 包。

没有精确或显式输出上限的 OpenCodex 请求不再记录适配器默认 `maxTokens` 标记，也不会发送 `max_tokens` 字段。代理发布输出上限时，可以把该值同步到模型条目；代理省略该值时，其请求默认策略保持权威。运维方仍可设置路由级后备值，但这会是显式部署选择，而不是跨提供方假设。
