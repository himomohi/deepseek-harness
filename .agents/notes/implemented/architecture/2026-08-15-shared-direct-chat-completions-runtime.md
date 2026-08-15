# Agent Note: Shared direct chat-completions runtime

Status: implemented

English | [中文](2026-08-15-shared-direct-chat-completions-runtime.zh.md)

## Problem

The OpenCodex package copied the DeepSeek adapter, serializer, SSE parser, translator, wire types, config resolution, credential lifecycle, and settings registration. The copies already diverged: OpenCodex guessed image capability from model names and flattened images to metadata, while its invariant companion still claimed the DeepSeek package name. Repository duplication reported 20 clones, most of them this adapter pair.

The two routes speak the same OpenAI-compatible chat-completions transport. Their real differences are provider identity, defaults, credential fallback, and model discovery. Keeping transport copies made every timeout, error, reasoning, or stream fix a two-file decision with no independent protocol reason.

The first shared lifecycle treated the official DeepSeek output default as a transport default and injected `max_tokens: 256000` into OpenCodex requests. OpenCodex routes heterogeneous models whose providers expose different output ranges; a reproduced `zai/glm-5.3` request was rejected because that route accepted at most 131,072. The proxy's model listing supplied the id but no output limit, so neither a shared constant nor a context-derived estimate represented authoritative model metadata.

## Decision

`@deepseek-ai/dsh-llm-deepseek` owns the reusable direct chat-completions adapter and `direct-provider` lifecycle. The shared lifecycle resolves and validates one config snapshot per operation, resolves the matching credential, registers provider metadata, swaps retry facts atomically, and binds an optional model-discovery callback.

The DeepSeek and OpenCodex entry modules retain local, statically walkable `Config` schemas and package-specific model types because documentation generation requires those declarations in the owning package. They supply their own route name, display label, endpoint variables, defaults, credential policy, and discovery behavior to the shared runtime.

OpenCodex deletes its copied adapter, serializer, parser, translator, and wire-type files. Its adapter label is `OpenCodex Proxy`, its loopback deployment may use the non-secret fallback token `local-opencodex`, and its `GET /models` parser preserves only metadata the proxy reports.

The shared lifecycle accepts an optional provider-owned output default. The official DeepSeek entry supplies its existing 256,000 value; OpenCodex supplies none. OpenCodex also omits guessed output caps from its built-in advisory catalog. Resolution uses an explicit call value first, then an exact model entry, then an explicitly configured route value. If all three are absent, serialization omits `max_tokens` and leaves output policy to the selected proxy model. Discovery preserves an exact positive `max_output_tokens` or `max_tokens` value when the proxy publishes one.

## Alternatives considered

**Keep twin adapters and suppress duplication.** Rejected because the copies had already produced behavior and invariant drift. Ignoring the full stack would make the quality gate pass without reducing maintenance risk.

**Create a new `llm-openai-compatible` package.** Rejected for this change because it would repackage the official DeepSeek surface and expand manifest, bundle, and documentation churn. The shared runtime is exported from the existing direct-adapter owner; a future independent consumer can justify a package split with actual evolution pressure.

**Make OpenCodex depend on the pi-ai adapter.** Rejected because pi-ai owns a library-backed multi-provider path with different catalog and protocol semantics. OpenCodex needs the same raw chat-completions wire behavior as the official direct adapter.

**Clamp every OpenCodex request to 131,072.** Rejected because the observed provider range belongs to one routed model and is not an OpenCodex-wide limit. A shared clamp would reject larger supported budgets and misrepresent smaller ones.

**Derive an output limit from the context window.** Rejected because combined context capacity does not establish the provider's maximum generated tokens. The adapter accepts only reported or explicitly configured output limits.

## Consequences

Transport fixes now land once for both routes, while provider-specific config and discovery remain independently documented. The source duplication gate reports zero clones after the shared runtime and shared client credential control are applied.

The package dependency graph adds `llm-opencodex` → `llm-deepseek`; project references and manifests declare it explicitly. The shared location is named after its current owner, so a future third direct provider may justify extracting a neutral package rather than continuing to broaden the DeepSeek package.

An OpenCodex request with no exact or explicit output cap no longer records an adapter-default `maxTokens` marker and sends no `max_tokens` field. A proxy that publishes an output cap can synchronize that value into the model entry; a proxy that omits it remains authoritative for the request default. Operators can still set a route-wide fallback, but it is an explicit deployment choice rather than a cross-provider assumption.
