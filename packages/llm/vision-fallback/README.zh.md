# @deepseek-ai/dsh-vision-fallback

[English](README.md) | 简体中文

DeepSeek Harness 自动视觉模型回退插件 (`@deepseek-ai/dsh-vision-fallback`)。

当当前处于活动状态的模型（例如 `deepseek-chat`, `deepseek-v3`, `deepseek-r1` 等仅支持文本输入的模型）收到图片附件时，该插件会自动调用环境中可用的多模态视觉模型（如通过 OpenCodex 或 Pi-AI 提供的 `gpt-5.6-sol`, `claude-3-7-sonnet`, `gemini-3.7-flash` 等），生成详尽的 OCR 文本与视觉画面解析，并无缝注入提示词中，让纯文本大模型也能理解图片内容。

## 特性

- **透明回退**：纯文本模型可正常接收用户上传的图片与 `read_image` 工具读取的图像文件，不再报模态不支持错误。
- **智能探测**：自动探测当前运行时注册的最优多模态大模型，亦支持在配置中显式指定回退模型。
- **去重缓存**：对图片附件根据 `AttachmentId` 进行解析结果缓存，避免多轮会话中重复请求视觉模型消耗 Token。
- **安全消息转换**：将消息历史中的图片块转换为结构化 Markdown 描述文本，保证下游 API 请求协议的绝对兼容性。

## Config

```yaml
- id: vision-fallback
  name: '@deepseek-ai/dsh-vision-fallback'
  config:
    enabled: true
    fallbackProvider: opencodex
    fallbackModel: gpt-5.6-sol
    maxTokens: 2048
```

## 模型体验

- **Tokens**：图片理解消耗独立于回退调用，主模型仅接收结构化文本描述。
- **KV Cache**：文本描述采用确定性格式注入，保证多轮会话中 KV Cache 前缀命中的稳定性。

## 已知局限与后续工作

无。
