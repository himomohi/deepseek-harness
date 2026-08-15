# @deepseek-ai/dsh-llm-opencodex

English | [中文](README.zh.md)

OpenCodex proxy provider for DeepSeek Harness. The plugin registers the `opencodex` route on the shared direct chat-completions runtime from `@deepseek-ai/dsh-llm-deepseek`, while keeping OpenCodex-specific defaults, credentials, labels, and live model discovery in this package.

The default endpoint is `http://127.0.0.1:10100/v1`. A local proxy may run without a configured key; a remote proxy can resolve `OPENCODEX_API_KEY` through the credentials service or trusted launch environment.

## Config

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

All fields are optional. `OPENCODEX_BASE_URL` supplies the endpoint only when `baseURL` is absent. An explicit `models` array replaces the built-in advisory list; unlisted model ids still pass through to the proxy.

The `llm-opencodex` settings namespace updates the endpoint, credential reference, catalog, thinking defaults, token caps, idle timeout, and retry policy without restarting. Each operation captures one validated snapshot, so an in-flight stream keeps the endpoint and credential it started with while the next operation observes accepted settings.

## Model discovery

The Models page can query `${baseURL}/models`. The parser accepts either an OpenAI `{ "data": [...] }` envelope or a top-level array, skips rows without a non-empty `id`, and preserves only capacities the proxy actually reports. It does not invent context or output limits for missing fields.

The discovery call can carry a draft credential or resolve the stored reference. Because it makes the Host fetch a configured URL and can carry a credential, `llm.discoverModels` remains loopback-only together with settings and credential RPCs; `trustedHosts` does not authenticate a remote caller.

## Shared transport

OpenCodex reuses the direct adapter’s request serialization, SSE parser, chunk translation, timeout handling, retry metadata, and provider-error normalization. That shared implementation removes a copied adapter stack and keeps wire fixes identical across the official DeepSeek and OpenCodex routes.

Only text input is declared. Image blocks are rejected before network I/O; this package does not claim vision support until attachment bytes have a tested, reconstructable OpenAI-compatible wire representation.

Assistant `reasoning_content` is replayed only on tool-call turns, matching DeepSeek thinking-mode passback. Plain-turn reasoning is omitted because the API ignores it and resending it adds tokens without proving a cache benefit.

## Model Experience

### OpenCodex request

#### What the model sees

The selected proxy model receives the harness system prompt, text message history, tool schemas, stop sequences, and resolved call config. The adapter adds no model-visible prompt prose.

#### Token effect

Provider tokenization determines exact input. Tool-call reasoning passback adds the reasoning required for that tool round trip; plain-turn reasoning is not resent.

#### KV Cache effect

An unchanged assembled prefix may be reused by the provider behind OpenCodex. Endpoint, provider, model, prompt, schema, or history changes may move the request to another cache domain or invalidate reuse from the first changed token; this package reports provider cache-read usage when the wire response includes it but makes no cache-hit promise.

### OpenCodex response

#### What the model sees

Reasoning, text, tool calls, usage, and finish state are translated into harness chunks for the loop to log and assemble.

#### Token effect

Generated tokens follow the resolved reasoning effort and `maxTokens`. A `max-tokens` finish remains terminal and is not turned into an automatic follow-up request.

#### KV Cache effect

Blocks retained by the loop append to the next request while preserving the earlier prefix. Dropped or provider-private fields do not affect later requests.

## Known Limitations and Deferred Work

- The shared direct adapter currently supports text-only chat-completions content; OpenAI-compatible image parts require a separate attachment-byte wire implementation.
- A settings `models` list replaces the composition list as one field; entries are not merged by id.
- `GET /models` availability and metadata vary by proxy, so users may need to enter missing capacities manually.
- Raw `fetch` owns transport; shared proxy and interception configuration remains deferred.
