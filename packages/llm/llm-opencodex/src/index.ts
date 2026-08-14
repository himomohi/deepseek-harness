/**
 * Register an OpenCodex Adapter for the `opencodex` provider route on `ctx.llm`.
 * Connects directly to local or remote OpenCodex proxy (default: http://127.0.0.1:10100/v1).
 *
 * @module @deepseek-ai/dsh-llm-opencodex
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { resolveRetryPolicy, RetryPolicySchema } from '@deepseek-ai/dsh-llm'
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf, type LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { deepEqualJson, installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { getOrCreateAnonymousUserId, type AnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  DeepSeekAdapter as OpenCodexAdapter,
} from './adapter.ts'
import type { DeepSeekCatalogModel as OpenCodexCatalogModel, DeepSeekConnectionOptions as OpenCodexConnectionOptions } from './adapter.ts'
import { discoverModels } from './discovery.ts'


export {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  DeepSeekAdapter as OpenCodexAdapter,
} from './adapter.ts'
export type { DeepSeekAdapterOptions as OpenCodexAdapterOptions, DeepSeekCatalogModel as OpenCodexCatalogModel, DeepSeekConnectionOptions as OpenCodexConnectionOptions } from './adapter.ts'
export type { RequestDefaults } from './serialize.ts'
export type * from './types.ts'

export const name = 'llm-opencodex'
export const inject = ['llm']

const NS = settingsNamespace('llm-opencodex')
const DEFAULT_API_KEY_ENV = 'OPENCODEX_API_KEY'
/** Provider route name for OpenCodex */
const PROVIDER = 'opencodex'

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


export interface Config {
  apiKeyEnv?: string
  baseURL?: string
  thinking?: 'enabled' | 'disabled'
  reasoningEffort?: 'off' | 'high' | 'max'
  maxTokens?: number
  defaultContextWindow?: number
  models?: OpenCodexCatalogModel[]
  streamIdleTimeoutMs?: number
  retryPolicy?: RetryPolicyConfig
}

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

export const PUBLIC_BASE_URL = 'http://127.0.0.1:10100/v1'
const BASE_URL_ENV = 'OPENCODEX_BASE_URL'

export type ResolvedOpenCodexOptions = OpenCodexConnectionOptions

function resolveModels(models: readonly OpenCodexCatalogModel[] | undefined): OpenCodexCatalogModel[] {
  const seen = new Set<string>()
  return (models ?? DEFAULT_MODELS).map((model) => {
    if (model.id.length === 0) throw new Error('llm-opencodex: catalog model ids must be non-empty')
    if (model.name !== undefined && model.name.length === 0) {
      throw new Error(`llm-opencodex: catalog model "${model.id}" has an empty name`)
    }
    if (model.contextWindow !== undefined
      && (!Number.isInteger(model.contextWindow) || model.contextWindow <= 0)) {
      throw new Error(
        `llm-opencodex: catalog model "${model.id}" contextWindow must be a positive integer`,
      )
    }
    if (model.maxTokens !== undefined
      && (!Number.isInteger(model.maxTokens) || model.maxTokens <= 0)) {
      throw new Error(
        `llm-opencodex: catalog model "${model.id}" maxTokens must be a positive integer`,
      )
    }
    if (seen.has(model.id)) throw new Error(`llm-opencodex: duplicate catalog model "${model.id}"`)
    seen.add(model.id)
    return {
      id: model.id,
      ...model.name === undefined ? {} : { name: model.name },
      ...model.description === undefined ? {} : { description: model.description },
      ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
      ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens },
    }
  })
}

export function resolveAdapterOptions(config: Config, environment?: LaunchEnvironmentSnapshot): ResolvedOpenCodexOptions {
  if (config.thinking === 'disabled'
    && config.reasoningEffort !== undefined
    && config.reasoningEffort !== 'off') {
    throw new Error('llm-opencodex: only reasoningEffort "off" can be configured when thinking is disabled')
  }
  if (config.defaultContextWindow !== undefined
    && (!Number.isInteger(config.defaultContextWindow) || config.defaultContextWindow <= 0)) {
    throw new Error('llm-opencodex: defaultContextWindow must be a positive integer')
  }
  if (config.maxTokens !== undefined
    && (!Number.isSafeInteger(config.maxTokens) || config.maxTokens <= 0)) {
    throw new Error('llm-opencodex: maxTokens must be a positive safe integer')
  }
  const streamIdleTimeoutMs = config.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS
  if (!Number.isFinite(streamIdleTimeoutMs)
    || streamIdleTimeoutMs <= 0
    || streamIdleTimeoutMs > MAX_TIMER_DELAY_MS) {
    throw new Error(
      `llm-opencodex: streamIdleTimeoutMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`,
    )
  }
  return {
    apiKeyEnv: credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV),
    baseURL: config.baseURL
      ?? environment?.get(BASE_URL_ENV)?.value
      ?? PUBLIC_BASE_URL,
    defaults: {
      thinking: config.thinking,
      reasoningEffort: config.reasoningEffort,
    },
    maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
    defaultContextWindow: config.defaultContextWindow ?? DEFAULT_CONTEXT_WINDOW,
    models: resolveModels(config.models),
    streamIdleTimeoutMs,
    retryPolicy: resolveRetryPolicy(config.retryPolicy, 'llm-opencodex: retryPolicy'),
  }
}

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  let lastRaw: Config | undefined
  let lastGood: ResolvedOpenCodexOptions | undefined
  const options = (): ResolvedOpenCodexOptions => {
    const raw = current()
    if (raw === lastRaw && lastGood !== undefined) return lastGood
    try {
      const next = resolveAdapterOptions(raw, launchEnvironmentOf(ctx))
      lastRaw = raw
      lastGood = next
      return next
    } catch (error) {
      if (lastGood === undefined) throw error
      lastRaw = raw
      ctx.logger.error('llm-opencodex: keeping the last good configuration after an invalid settings section')
      ctx.logger.error(error)
      return lastGood
    }
  }
  options()

  const resolveApiKey = async (connection: ResolvedOpenCodexOptions): Promise<string> => {
    const ref = connection.apiKeyEnv
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      const hit = await credentials.resolve(ref)
      if (hit !== undefined && hit.value.length > 0) return hit.value
    } else {
      const ambient = launchEnvironmentOf(ctx).get(ref)
      if (ambient !== undefined && ambient.value.length > 0) {
        return ambient.value
      }
    }
    // OpenCodex defaults to local proxy which may not require an API key
    return 'local-opencodex'
  }

  let userId: AnonymousUserId | undefined
  const resolveUserId = (): AnonymousUserId => userId ??= getOrCreateAnonymousUserId()
  const adapter = new OpenCodexAdapter({ options, resolveApiKey, resolveUserId })
  ctx.llm.registerConfigurableProviders([
    { provider: PROVIDER, displayName: 'OpenCodex Proxy', settingsNs: NS, settingsPath: [] },
  ])
  const registration = ctx.llm.registerAdapter([PROVIDER], adapter)
  let registeredPolicy = options().retryPolicy
  const ensureRegistrationFacts = (): void => {
    const policy = options().retryPolicy
    if (deepEqualJson(policy, registeredPolicy)) return
    registration.replace([PROVIDER])
    registeredPolicy = policy
  }

  const storedApiKey = async (): Promise<string | undefined> => {
    return resolveApiKey(options())
  }
  ctx.llm.registerModelDiscovery(NS, request => discoverModels(request, storedApiKey))

  installSettingsSection(ctx, NS, Config, config, {
    setSource: (source) => {
      current = source
    },
    onChange: ensureRegistrationFacts,
  })
}
