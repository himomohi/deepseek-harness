# @deepseek-ai/dsh-llm-opencodex

[English](README.md) | 中文

DeepSeek Harness 的 OpenCodex 代理提供方。该插件在 `@deepseek-ai/dsh-llm-deepseek` 提供的共享直接 chat-completions 运行时上注册 `opencodex` 路由，同时由本包保留 OpenCodex 专属默认值、凭据、显示名称和实时模型发现。

默认端点为 `http://127.0.0.1:10100/v1`。本地代理可以不配置密钥；远程代理可通过凭据服务或可信启动环境解析 `OPENCODEX_API_KEY`。

## 配置

```yaml
- id: llm-opencodex
  name: '@deepseek-ai/dsh-llm-opencodex'
  config:
    apiKeyEnv: OPENCODEX_API_KEY
    baseURL: http://127.0.0.1:10100/v1
    thinking: enabled
    reasoningEffort: high
    maxTokens: 256000
    defaultContextWindow: 1000000
    streamIdleTimeoutMs: 300000
    models:
      - id: gpt-5.6-sol
        name: GPT-5.6 Sol
        contextWindow: 1000000
        maxTokens: 64000
```

所有字段均可省略。仅当 `baseURL` 缺失时，`OPENCODEX_BASE_URL` 才提供端点。显式 `models` 数组会替换内置建议列表；未列出的模型 id 仍会原样发送给代理。

`llm-opencodex` 设置 namespace 可在不重启的情况下更新端点、凭据引用、目录、思考默认值、Token 上限、空闲超时和重试策略。每次操作捕获一份已校验快照，因此进行中的流保持其起始端点与凭据，下一次操作才观察已接受的新设置。

## 模型发现

Models 页面可以查询 `${baseURL}/models`。解析器接受 OpenAI `{ "data": [...] }` 信封或顶层数组，跳过没有非空 `id` 的条目，并且只保留代理实际报告的容量。缺失字段不会被补成猜测的上下文或输出上限。

发现调用可以携带草稿凭据，或解析已存储引用。由于该调用会让 Host 请求一个已配置 URL，且可能携带凭据，`llm.discoverModels` 与设置、凭据 RPC 一样保持仅限回环地址；`trustedHosts` 并不会认证远程调用方。

## 共享传输

OpenCodex 复用直接适配器的请求序列化、SSE 解析、分片转换、超时处理、重试元数据和提供方错误归一化。共享实现删除了复制的适配器栈，并使官方 DeepSeek 与 OpenCodex 路由获得相同的 wire 修复。

该适配器只声明文本输入。图片块会在网络 I/O 前被拒绝；在附件字节具备经过测试且可重建的 OpenAI 兼容 wire 表示之前，本包不会宣称视觉能力。

Assistant 的 `reasoning_content` 仅在工具调用轮次回传，符合 DeepSeek 思考模式回传要求。普通轮次推理不会重发，因为 API 会忽略它，而额外 Token 也不能证明缓存收益。

## 模型体验

### OpenCodex 请求

#### 模型看到的内容

所选代理模型会收到 harness 系统提示词、文本消息历史、工具 schema、停止序列和已解析调用配置。适配器不会添加模型可见提示词文本。

#### Token 影响

精确输入由提供方 Tokenization 决定。工具调用推理回传会加入该工具往返所需的推理；普通轮次推理不会再次发送。

#### KV Cache 影响

未变化的已组装前缀可能被 OpenCodex 背后的提供方复用。端点、提供方、模型、提示词、schema 或历史变化可能切换缓存域，或从第一个变化 Token 起使复用失效；wire 响应包含 cache-read 用量时本包会报告，但不承诺缓存命中率。

### OpenCodex 响应

#### 模型看到的内容

推理、文本、工具调用、用量和结束状态会转换为 harness 分片，供 loop 记录和组装。

#### Token 影响

生成 Token 遵循已解析推理强度和 `maxTokens`。`max-tokens` 结束保持终止状态，不会变成自动后续请求。

#### KV Cache 影响

Loop 保留的块会追加到下一次请求，同时保留较早前缀。已丢弃字段或提供方私有字段不会影响后续请求。

## 已知限制与暂缓事项

- 共享直接适配器目前只支持文本 chat-completions 内容；OpenAI 兼容图片 part 需要独立的附件字节 wire 实现。
- 设置中的 `models` 列表作为一个字段整体替换组合列表，不会按 id 合并条目。
- 各代理的 `GET /models` 可用性和元数据不同，缺失容量可能需要用户手动输入。
- 传输仍由原始 `fetch` 负责；共享代理和拦截配置暂缓。
