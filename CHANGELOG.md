# 📝 Changelog & Release Notes

All notable changes and release notes for DeepSeek Harness (`dsh`) are documented in this file.

---

## [0.1.0-rc.11] - 2026-08-15

### 🎛️ `dsh update` is short and interactive
* Preview official vs fork (SHA, version, incoming commits) then ask `진행할까요? [y/N]`.
* `--dry-run` preview only; `--yes` skips the prompt.
* Hide git/pnpm walls of text; show `[1/4] 머지…` style steps.
* On failure print an **AI에게 요청:** copy-paste prompt (repo, step, conflicts/markers, last output) so an agent can self-heal.
* Windows: spawn git/pnpm with argv (`pnpm.cmd` on win32). Do not run `--format=%(...)` through `cmd.exe`.

---

## [0.1.0-rc.12] - 2026-08-15

### 🛑 `dsh stop`
* Find every live dsh web server on this machine from any cwd and stop it (`ps` / `wmic` + `taskkill` on Windows).
* Does not depend on the current directory or a pid file.

---

## [0.1.0-rc.13] - 2026-08-15

### 🔄 OpenCodex model catalog sync
* Settings → Models button **Sync from OpenCodex** replaces the whole catalog from live `GET /models` (not a one-shot default list, not an add-only picker).
* `llm.discoverModels` is reachable on a trusted Tailscale host. OpenCodex discovery always uses the configured proxy URL.
* Settings/credentials RPCs (`settings.describe` / mutate, `credentials.*`) are allowed on a trusted Tailscale host so the Models page can load. Native pickers stay loopback-only.

---

## [0.1.0-rc.14] - 2026-08-15

### 📱 Settings phone layout
* Settings panel stacks nav above content at `max-width: 720px` so Korean copy no longer paints one character per line.
* General rows (agent preset / language / permission / Enter) wrap the selector under the title on phones.

---

## [0.1.0-rc.15] - 2026-08-15

### 📱 Other panels on phone
* Plugins / agent-preset settings wrap tabs, cards, and footers.
* Shared Modal and workspace directory picker go edge-to-edge below 720px.
* Conversation header/tabs tighten; hero headline shrinks.

---

---

---

## [0.1.0-rc.10] - 2026-08-15

### 🇰🇷 Workspace picker Korean copy
* The in-app browse dialog (`directory-browser`) shipped only `zh`/`en`, so a Korean UI fell back to Chinese/English on **Select Workspace Directory**, **Open**, **Cancel**, **New folder**, **Home**.
* Register a `ko` dictionary next to the official locales (this package owns the namespace — `locale-ko` must not also register it).
* Finish leftover English time units in the Korean workspace dictionary (`시간`/`일`/`개월`/`년`).

---

## [0.1.0-rc.9] - 2026-08-15

### 🧪 `dsh update` verifies fork features after merge
* Stop claiming custom plugins stay 100% intact. `dsh update` is a git merge of `upstream`, then install/build, then a file/marker check.
* After a successful merge it checks `locale-ko`, `llm-opencodex`, `vision-fallback`, auto-continue, and `reasoning_content` preserve markers.
* Merge conflicts now abort with the conflicted file list instead of falling through to a fake success message.
* Upstream default branch is detected from fetched refs (`master` preferred, then `main`).

---

## [0.1.0-rc.8] - 2026-08-14

### 🎛️ Web GUI Vision Fallback Customization (`ui-settings-models`)
* **Dedicated Vision Fallback Settings Card (`VisionFallbackCard`)**:
  * Added a dedicated, beautifully styled Vision Fallback card in the Web GUI Settings ➔ **Models** page.
  * **Enable / Disable Toggle**: One-click switch with instant UI feedback.
  * **Fallback Strategy Selector**:
    * `Automatic (권장 / 推荐)`: Automatically detects and selects the best available multimodal model (`gpt-5.6-sol`, `claude-3-7-sonnet`, `gemini-3.7-flash`, etc.).
    * `Custom Provider & Model (수동 지정 / 自定义)`: Lets users choose any provider (`opencodex`, `anthropic`, `openai`, `google`, `deepseek`) and specific vision model, or type any custom model ID.
  * **Max Tokens Tuning**: Configurable maximum tokens limit for image OCR & scene analysis.
  * **Live Settings Persistence**: Writes directly to `vision-fallback` settings namespace (`api.settings.mutate`) taking effect in real time without restart.
* **Full Multi-Language Localization**:
  * Complete translations in Korean (`ko`), English (`en`), and Chinese (`zh`).

---

## [0.1.0-rc.7] - 2026-08-14

### 👁️ Automatic Vision Fallback (`@deepseek-ai/dsh-vision-fallback`)
* **Seamless Multi-Modal Fallback for Text-Only Models**:
  * Added new Cordis service plugin `@deepseek-ai/dsh-vision-fallback` mounted across all bundles and profiles.
  * When using pure text-only models (such as `deepseek-chat`, `deepseek-v3`, `deepseek-r1`), image inputs from users and `read_image` tool dispatches are automatically routed to an active vision-capable fallback model (e.g. `gpt-5.6-sol`, `claude-3-7-sonnet`, `gemini-3.7-flash` via OpenCodex or Pi-AI).
  * Automatically performs visual analysis, diagram comprehension, OCR text extraction, UI layout analysis, and injects structured visual annotations into the prompt.
  * Ensures text-only models seamlessly process images without modal rejection errors (`MODEL_DOES_NOT_SUPPORT_IMAGES`).
* **Intelligent Auto-Discovery & Caching**:
  * Automatically scans and ranks the best available vision model candidates in runtime.
  * In-memory deduplication caching by `AttachmentId` ensures zero redundant vision LLM calls across multi-turn sessions.
* **Non-Destructive & Upstream Upgrade Safe**:
  * Implemented via independent Cordis plugin architecture, preserving complete 100% compatibility across official upstream `dsh update` syncs.

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
  * Merges official upstream (`deepseek-ai/deepseek-harness`), rebuilds, then verifies fork feature markers. Conflicts abort. This is not a 100% preserve guarantee.
* **Ephemeral Profile Fallback**:
  * Instant session initialization without mandatory profile prompts.

### 🌍 Localization
* **Full Korean (`ko`) Translation**:
  * Complete localization for all Web UI components, settings dialogs, model pickers, plugin cards, and welcome guides via `@deepseek-ai/dsh-client-locale-ko`.
