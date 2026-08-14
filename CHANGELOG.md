# 📝 Changelog & Release Notes

All notable changes and release notes for DeepSeek Harness (`dsh`) are documented in this file.

---

## [0.1.0-rc.6] - 2026-08-14

### ⚡ Performance & Caching (Prompt Cache & KV Cache)
* **Preserve `reasoning_content` across multi-turn turns**:
  * Fixed DeepSeek & OpenCodex API serialization (`serialize.ts`) to retain assistant thinking tokens across subsequent turns.
  * Prevents server-side KV Cache Prefix Invalidation, elevating Cache Hit Rates from ~10% up to **85% ~ 98%+**, drastically cutting TTFT (Time-to-First-Token) and API cost.
* **Default Prompt Cache Retention in `llm-pi-ai`**:
  * Activated `cacheRetention: 'short'` by default for Anthropic Claude and compatible providers.

### 🔄 Agent Loop & Output Reliability
* **Auto-Continue Generation on Token Limit (`max-tokens`)**:
  * Implemented automatic seamless continuation in `packages/core/agent-loop/src/agent.ts`.
  * When generation hits the output token limit without tool calls, the agent loop immediately queues a continuation message to complete long responses and source code without interruption.

### 🌐 OpenCodex (`ocx`) Integration
* **Dedicated `@deepseek-ai/dsh-llm-opencodex` Package**:
  * Automatic discovery of local `ocx` proxy at `http://127.0.0.1:10100/v1`.
  * Instant active status (green indicator) without requiring API key configuration.
  * Real-time dynamic model discovery (`GET /v1/models`).
  * 29 pre-configured model catalogs including `gpt-5.6`, `gpt-5.6-codex`, `claude-3-7-sonnet`, `deepseek-v4`, `grok-4.6`, `minimax-m3`, `glm-5.2`, `command-code`, etc.

### 🚀 CLI & Cross-Platform UX
* **Auto Browser Launch**:
  * Running `dsh` or `dsh web` automatically launches the default browser on Windows, macOS (`open`), and Linux (`xdg-open`).
* **Terminal Multi-Language Feedback**:
  * Automatically detects system locale (`ko`, `zh`, `en`) and prints friendly terminal startup messages.
* **`dsh update` Command**:
  * One-touch command to synchronize upstream releases (`deepseek-ai/deepseek-harness`), auto-merging updates while preserving custom plugins and Korean localization.
* **Ephemeral Profile Fallback**:
  * Instant session initialization without mandatory profile prompts.

### 🌍 Localization
* **Full Korean (`ko`) Translation**:
  * Complete localization for all Web UI components, settings dialogs, model pickers, plugin cards, and welcome guides via `@deepseek-ai/dsh-client-locale-ko`.
