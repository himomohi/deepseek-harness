/**
 * Register the OpenCodex proxy on the shared direct chat-completions runtime.
 *
 * Connection and credential facts resolve per request from the optional
 * `llm-opencodex` settings section. The default loopback proxy needs no
 * configured token, while a remote proxy can use `OPENCODEX_API_KEY`.
 * @module @deepseek-ai/dsh-llm-opencodex
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { RetryPolicySchema, type RetryPolicyConfig } from '@deepseek-ai/dsh-llm'
import type { LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  DeepSeekAdapter as OpenCodexAdapter,
  installDirectProvider,
  resolveDirectProviderOptions,
} from '@deepseek-ai/dsh-llm-deepseek'
import type {
  DeepSeekAdapterOptions as OpenCodexAdapterOptions,
  DeepSeekConnectionOptions as OpenCodexConnectionOptions,
  RequestDefaults,
} from '@deepseek-ai/dsh-llm-deepseek'
import { discoverModels } from './discovery.ts'

export {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  OpenCodexAdapter,
}
export type {
  OpenCodexAdapterOptions,
  OpenCodexConnectionOptions,
  RequestDefaults,
}

/** Stable Cordis plugin name. */
export const name = 'llm-opencodex'
/** Service required before the provider route can register. */
export const inject = ['llm']

const NS = settingsNamespace('llm-opencodex')
const DEFAULT_API_KEY_ENV = 'OPENCODEX_API_KEY'
const PROVIDER = 'opencodex'

/** One model advertised by the OpenCodex proxy adapter. */
export interface OpenCodexCatalogModel {
  /** Model id accepted by the proxy. */
  id: string
  /** Selector label; defaults to {@link id}. */
  name?: string
  /** Optional selector detail. */
  description?: string
  /** Known combined request and response context capacity. */
  contextWindow?: number
  /** Known output-token cap. */
  maxTokens?: number
}

const DEFAULT_MODELS: OpenCodexCatalogModel[] = [
  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'gpt-5.3-codex-spark', name: 'GPT-5.3 Codex Spark', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'deepseek/deepseek-v4-pro', name: 'DeepSeek V4 Pro', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'xai/grok-4.5', name: 'xAI Grok 4.5', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'xai/grok-4.6', name: 'xAI Grok 4.6', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'minimax/MiniMax-M3', name: 'MiniMax M3', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'zai/glm-5.2', name: 'Z-AI GLM 5.2', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'alibaba-token-plan-intl/deepseek-v4-flash-0731', name: 'Alibaba DeepSeek V4 Flash', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'alibaba-token-plan-intl/qwen3.8-max', name: 'Alibaba Qwen 3.8 Max', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'commandcode/deepseek/deepseek-v4-flash', name: 'CommandCode DeepSeek V4 Flash', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/deepseek/deepseek-v4-pro', name: 'CommandCode DeepSeek V4 Pro', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/google/gemini-3.7-flash', name: 'CommandCode Gemini 3.7 Flash', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'commandcode/gpt-5.6-luna', name: 'CommandCode GPT-5.6 Luna', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/meta/muse-spark-1.2-contributor', name: 'CommandCode Muse Spark 1.2', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/moonshotai/Kimi-K3', name: 'CommandCode Kimi K3', contextWindow: 1_000_000, maxTokens: 64_000 },
  { id: 'commandcode/nvidia/nemotron-3-ultra-550b-a55b', name: 'CommandCode Nemotron 3 Ultra', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/poolside/laguna-s-2.1-free', name: 'CommandCode Laguna S 2.1 Free', contextWindow: 200_000, maxTokens: 16_000 },
  { id: 'commandcode/Qwen/Qwen3.8-Max', name: 'CommandCode Qwen 3.8 Max', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/sakana/fugu-ultra', name: 'CommandCode Fugu Ultra', contextWindow: 200_000, maxTokens: 16_000 },
  { id: 'commandcode/stepfun/Step-3.5-Flash', name: 'CommandCode Step 3.5 Flash', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/stepfun/Step-3.7-Flash', name: 'CommandCode Step 3.7 Flash', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/tencent/hy3-paid', name: 'CommandCode HY3 Paid', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/thinkingmachines/inkling', name: 'CommandCode Inkling', contextWindow: 200_000, maxTokens: 16_000 },
  { id: 'commandcode/xai/grok-4.6', name: 'CommandCode Grok 4.6', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/xiaomi/mimo-v2.5', name: 'CommandCode MiMo V2.5', contextWindow: 500_000, maxTokens: 32_000 },
  { id: 'commandcode/xiaomi/mimo-v2.5-pro', name: 'CommandCode MiMo V2.5 Pro', contextWindow: 500_000, maxTokens: 32_000 },
]

/** OpenCodex proxy plugin and live-settings fields. */
export interface Config {
  /** Credential reference; defaults to `OPENCODEX_API_KEY`. */
  apiKeyEnv?: string
  /** Proxy endpoint; defaults to the local OpenCodex service. */
  baseURL?: string
  /** Deployment thinking policy. */
  thinking?: 'enabled' | 'disabled'
  /** Default reasoning effort; omission uses the adapter default. */
  reasoningEffort?: 'off' | 'high' | 'max'
  /** Default per-request output cap. */
  maxTokens?: number
  /** Context capacity used when a model entry omits one. */
  defaultContextWindow?: number
  /** Advisory models shown before live discovery replaces the catalog. */
  models?: OpenCodexCatalogModel[]
  /** Maximum provider idle time while a stream read is pending. */
  streamIdleTimeoutMs?: number
  /** Provider-owned model-request retry policy. */
  retryPolicy?: RetryPolicyConfig
}

/* jscpd:ignore-start -- config catalogs require a local, statically walkable schema */
const catalogModel: z<OpenCodexCatalogModel> = z.object({
  id: z.string().required(),
  name: z.string(),
  description: z.string(),
  contextWindow: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
})

export const Config: z<Config> = z.object({
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  baseURL: z.string().default('http://127.0.0.1:10100/v1'),
  thinking: z.union(['enabled', 'disabled']),
  reasoningEffort: z.union(['off', 'high', 'max']),
  maxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_TOKENS),
  defaultContextWindow: z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW),
  models: z.array(catalogModel).default(DEFAULT_MODELS),
  streamIdleTimeoutMs: z.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
  retryPolicy: RetryPolicySchema,
})
/* jscpd:ignore-end */

/** Default loopback OpenCodex API base. */
export const PUBLIC_BASE_URL = 'http://127.0.0.1:10100/v1'
const BASE_URL_ENV = 'OPENCODEX_BASE_URL'

/** Complete connection facts resolved for one OpenCodex operation. */
export type ResolvedOpenCodexOptions = OpenCodexConnectionOptions

/**
 * Resolve and validate one OpenCodex config snapshot.
 * @param config - composition entry or live settings value.
 * @param environment - trusted launch environment layers.
 * @returns complete connection and request defaults.
 */
export function resolveAdapterOptions(
  config: Config,
  environment?: LaunchEnvironmentSnapshot,
): ResolvedOpenCodexOptions {
  return resolveDirectProviderOptions(config, environment, {
    packageName: 'llm-opencodex',
    defaultApiKeyEnv: DEFAULT_API_KEY_ENV,
    baseUrlEnv: BASE_URL_ENV,
    publicBaseUrl: PUBLIC_BASE_URL,
    defaultModels: DEFAULT_MODELS,
  })
}

/**
 * Register the OpenCodex route, discovery, credentials, and live settings.
 * @param ctx - Cordis context carrying the LLM service.
 * @param config - composition-level defaults.
 */
export function apply(ctx: Context, config: Config): void {
  installDirectProvider(ctx, config, {
    packageName: 'llm-opencodex',
    settingsNs: NS,
    schema: Config,
    provider: PROVIDER,
    displayName: 'OpenCodex Proxy',
    fallbackToken: 'local-opencodex',
    resolveOptions: resolveAdapterOptions,
    discoverModels: (request, apiKeyResolver, connection) => discoverModels({
      ...request,
      baseURL: connection.baseURL,
    }, apiKeyResolver),
  })
}
