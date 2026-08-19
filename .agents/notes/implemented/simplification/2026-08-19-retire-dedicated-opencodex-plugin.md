# Agent Note: Retire the dedicated OpenCodex provider plugin

Status: implemented

English | [中文](2026-08-19-retire-dedicated-opencodex-plugin.zh.md)

## Problem

`@deepseek-ai/dsh-llm-opencodex` existed so this fork could talk to a local OpenCodex proxy before OpenCodex could host DeepSeek Harness itself. That package registered a second `opencodex` route, a plugin-settings card, and a `dsh update` marker. The maintained Web profile already disabled the row because `llm-pi-ai.providers.opencodex` owned the same route. Keeping both made every upstream merge resolve a provider the product composition did not run.

## Decision

The dedicated package, its base-bundle row, the Plugins-settings OpenCodex card, and the `llm-opencodex` update marker are removed. OpenCodex remains a Models-page provider on the official `llm-pi-ai` path: a profile named `opencodex` with the proxy base URL and credential. Live `GET /models` sync stays on that provider id, not on a private settings namespace.

The shared DeepSeek direct chat-completions runtime stays for the official DeepSeek adapter only.

## Alternatives considered

**Keep the package disabled in every profile.** Rejected because `dsh update` still treated it as a fork-owned marker, and merge conflicts continued to land in unused provider code.

**Move the dedicated adapter into a separately published plugin.** Rejected because OpenCodex now supplies the DSH-facing integration; a second adapter would still double-register the `opencodex` route.

## Consequences

A composition that listed `@deepseek-ai/dsh-llm-opencodex` must switch to an `llm-pi-ai` OpenCodex provider or fail to resolve that package. The fork no longer promises a private chat-completions OpenCodex adapter, text-only wire policy, or plugin-card endpoint editor. Output-limit and discovery behavior follow `llm-pi-ai`.

## Related decisions

[Shared direct chat-completions runtime](../architecture/2026-08-15-shared-direct-chat-completions-runtime.md) still owns the DeepSeek direct adapter. Its earlier rejection of a pi-ai OpenCodex path applied while OpenCodex lacked a DSH integration.

[Keep the public fork README current](../process/2026-08-16-public-fork-readme-accuracy.md) must list OpenCodex only as a Models-page provider, not as a fork-owned package.
