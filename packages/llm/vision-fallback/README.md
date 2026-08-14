# @deepseek-ai/dsh-vision-fallback

English | [中文](README.zh.md)

Automatic Vision Fallback service for DeepSeek Harness (`@deepseek-ai/dsh-vision-fallback`).

When an active LLM (such as `deepseek-chat`, `deepseek-v3`, `deepseek-r1`) does not support image input modalities, this plugin routes image attachments through an available vision-capable model (e.g. `gpt-5.6-sol`, `claude-3-7-sonnet`, `gemini-3.7-flash` via OpenCodex or Pi-AI), generates an accurate OCR and visual scene description, and annotates the prompt seamlessly.

## Features

- **Transparent Fallback**: Non-vision models can accept images from users and `read_image` tool outputs without failing or aborting.
- **Smart Model Discovery**: Automatically locates the best available vision model in the environment or accepts explicit provider/model overrides in config.
- **Deduplicated Caching**: Attachment image descriptions are cached by `AttachmentId` to avoid redundant LLM vision calls across multi-turn sessions.
- **Safe Message Transformation**: Converts image blocks in message history into structured markdown text representations with visual OCR details.

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

## Model Experience

- **Tokens**: Vision inspection cost is bounded to the fallback sub-call and returned as descriptive text in the main request.
- **KV Cache**: Text descriptions are formatted deterministically, preserving KV Cache prefix stability across multi-turn agent execution.

## Known Limitations and Deferred Work

None.
