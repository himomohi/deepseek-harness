/**
 * Shared runtime for direct OpenAI-compatible chat-completions providers.
 *
 * DeepSeek and the fork's OpenCodex proxy differ in defaults, credentials,
 * and discovery, not in stream transport or live-settings ownership. This
 * module keeps that common lifecycle in one implementation.
 * @module dsh-llm-deepseek/direct-provider
 */

import type { Context } from '@deepseek-ai/cordis'
import type z from '@deepseek-ai/schemastery'
import {
  assertUsableApiKey,
  LlmError,
  resolveRetryPolicy,
  type LlmDiscoveredModel,
  type LlmModelDiscoveryRequest,
  type RetryPolicyConfig,
} from '@deepseek-ai/dsh-llm'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf, type LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import {
  deepEqualJson,
  installSettingsSection,
  type SettingsNamespace,
} from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { getOrCreateAnonymousUserId, type AnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  DeepSeekAdapter,
  type DeepSeekCatalogModel,
  type DeepSeekConnectionOptions,
} from './adapter.ts'

/** Raw fields shared by direct chat-completions provider configurations. */
export interface DirectProviderConfig<Model extends DeepSeekCatalogModel = DeepSeekCatalogModel> {
  /** Credential reference resolved for each request. */
  apiKeyEnv?: string
  /** Endpoint base URL. */
  baseURL?: string
  /** Deployment thinking policy. */
  thinking?: 'enabled' | 'disabled'
  /** Default reasoning effort. */
  reasoningEffort?: 'off' | 'low' | 'high' | 'max'
  /** Optional route-wide output-token cap. */
  maxTokens?: number
  /** Default combined request and response context capacity. */
  defaultContextWindow?: number
  /** Advisory model catalog. */
  models?: Model[]
  /** Maximum provider idle interval while a stream read is pending. */
  streamIdleTimeoutMs?: number
  /** Provider-owned request retry policy. */
  retryPolicy?: RetryPolicyConfig
}

/** Provider-specific defaults used by {@link resolveDirectProviderOptions}. */
export interface DirectProviderDefaults<Model extends DeepSeekCatalogModel> {
  /** Package label prefixed to validation diagnostics. */
  packageName: string
  /** Default credential reference. */
  defaultApiKeyEnv: string
  /** Trusted environment variable naming the endpoint. */
  baseUrlEnv: string
  /** Endpoint used when config and environment omit one. */
  publicBaseUrl: string
  /** Output-token cap used when config omits one; omission preserves provider-owned behavior. */
  defaultMaxTokens?: number
  /** Advisory catalog used when config omits one. */
  defaultModels: readonly Model[]
}

/** Registration facts that differ between direct providers. */
export interface DirectProviderRegistration<Config extends DirectProviderConfig> {
  /** Package label prefixed to runtime diagnostics. */
  packageName: string
  /** Cordis settings namespace owned by the provider. */
  settingsNs: SettingsNamespace
  /** Validated schema registered with the settings service. */
  schema: z<Config>
  /** LLM provider route. */
  provider: string
  /** Human-readable provider name. */
  displayName: string
  /** Resolve one raw config snapshot into complete adapter options. */
  resolveOptions: (config: Config, environment: LaunchEnvironmentSnapshot) => DeepSeekConnectionOptions
  /** Token used only when no configured credential is available. */
  fallbackToken?: string
  /** Optional provider model discovery implementation. */
  discoverModels?: (
    request: LlmModelDiscoveryRequest,
    apiKeyResolver: () => Promise<string | undefined>,
    connection: DeepSeekConnectionOptions,
  ) => Promise<readonly LlmDiscoveredModel[]>
}

/**
 * Resolve and detach all connection facts shared by direct providers.
 * @param config - raw composition or live settings value.
 * @param environment - trusted launch environment layers.
 * @param defaults - provider-specific names and defaults.
 * @returns validated connection facts for one adapter operation.
 */
export function resolveDirectProviderOptions<Model extends DeepSeekCatalogModel>(
  config: DirectProviderConfig<Model>,
  environment: LaunchEnvironmentSnapshot | undefined,
  defaults: DirectProviderDefaults<Model>,
): DeepSeekConnectionOptions {
  const { packageName } = defaults
  if (config.thinking === 'disabled'
    && config.reasoningEffort !== undefined
    && config.reasoningEffort !== 'off') {
    throw new Error(`${packageName}: only reasoningEffort "off" can be configured when thinking is disabled`)
  }
  if (config.defaultContextWindow !== undefined
    && (!Number.isInteger(config.defaultContextWindow) || config.defaultContextWindow <= 0)) {
    throw new Error(`${packageName}: defaultContextWindow must be a positive integer`)
  }
  if (config.maxTokens !== undefined
    && (!Number.isSafeInteger(config.maxTokens) || config.maxTokens <= 0)) {
    throw new Error(`${packageName}: maxTokens must be a positive safe integer`)
  }
  const streamIdleTimeoutMs = config.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS
  if (!Number.isFinite(streamIdleTimeoutMs)
    || streamIdleTimeoutMs <= 0
    || streamIdleTimeoutMs > MAX_TIMER_DELAY_MS) {
    throw new Error(
      `${packageName}: streamIdleTimeoutMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`,
    )
  }
  const seen = new Set<string>()
  const models = (config.models ?? defaults.defaultModels).map((model) => {
    if (model.id.length === 0) throw new Error(`${packageName}: catalog model ids must be non-empty`)
    if (model.name !== undefined && model.name.length === 0) {
      throw new Error(`${packageName}: catalog model "${model.id}" has an empty name`)
    }
    if (model.contextWindow !== undefined
      && (!Number.isInteger(model.contextWindow) || model.contextWindow <= 0)) {
      throw new Error(`${packageName}: catalog model "${model.id}" contextWindow must be a positive integer`)
    }
    if (model.maxTokens !== undefined
      && (!Number.isInteger(model.maxTokens) || model.maxTokens <= 0)) {
      throw new Error(`${packageName}: catalog model "${model.id}" maxTokens must be a positive integer`)
    }
    if (seen.has(model.id)) throw new Error(`${packageName}: duplicate catalog model "${model.id}"`)
    seen.add(model.id)
    return {
      id: model.id,
      ...model.name === undefined ? {} : { name: model.name },
      ...model.description === undefined ? {} : { description: model.description },
      ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
      ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens },
    }
  })
  const maxTokens = config.maxTokens ?? defaults.defaultMaxTokens
  return {
    apiKeyEnv: credentialRef(config.apiKeyEnv ?? defaults.defaultApiKeyEnv),
    baseURL: config.baseURL
      ?? environment?.get(defaults.baseUrlEnv)?.value
      ?? defaults.publicBaseUrl,
    defaults: {
      thinking: config.thinking,
      reasoningEffort: config.reasoningEffort,
    },
    ...maxTokens === undefined ? {} : { maxTokens },
    defaultContextWindow: config.defaultContextWindow ?? DEFAULT_CONTEXT_WINDOW,
    models,
    streamIdleTimeoutMs,
    retryPolicy: resolveRetryPolicy(config.retryPolicy, `${packageName}: retryPolicy`),
  }
}

async function resolveApiKey(
  ctx: Context,
  connection: DeepSeekConnectionOptions,
  registration: {
    packageName: string
    provider: string
    fallbackToken?: string
  },
): Promise<string> {
  const ref = connection.apiKeyEnv
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) {
    const hit = await credentials.resolve(ref)
    if (hit !== undefined) {
      return assertUsableApiKey(hit.value, registration.packageName, ref)
    }
  } else {
    const ambient = launchEnvironmentOf(ctx).get(ref)
    if (ambient !== undefined && ambient.value.length > 0) {
      return assertUsableApiKey(ambient.value, registration.packageName, ref)
    }
  }
  if (registration.fallbackToken !== undefined) return registration.fallbackToken
  throw new LlmError(
    `${registration.packageName}: no API key for provider route "${registration.provider}"; store ${ref}`
    + ` through the credentials service (the web Models page writes it), or export ${ref}`
    + ' in the launching environment',
    'MISSING_CREDENTIAL',
  )
}

/**
 * Register one direct provider with live settings and registration-bound retry facts.
 * @param ctx - Cordis context carrying the LLM service and optional settings and credentials.
 * @param config - composition-level provider config.
 * @param registration - provider-specific route, schema, defaults, and optional discovery.
 */
export function installDirectProvider<Config extends DirectProviderConfig>(
  ctx: Context,
  config: Config,
  registration: DirectProviderRegistration<Config>,
): void {
  let current: () => Config = () => config
  let lastRaw: Config | undefined
  let lastGood: DeepSeekConnectionOptions | undefined
  const options = (): DeepSeekConnectionOptions => {
    const raw = current()
    if (raw === lastRaw && lastGood !== undefined) return lastGood
    try {
      const next = registration.resolveOptions(raw, launchEnvironmentOf(ctx))
      lastRaw = raw
      lastGood = next
      return next
    } catch (error: unknown) {
      if (lastGood === undefined) throw error
      lastRaw = raw
      ctx.logger.error(`${registration.packageName}: keeping the last good configuration after an invalid settings section`)
      ctx.logger.error(error)
      return lastGood
    }
  }
  options()

  let userId: AnonymousUserId | undefined
  const apiKey = (connection: DeepSeekConnectionOptions): Promise<string> =>
    resolveApiKey(ctx, connection, registration)
  const adapter = new DeepSeekAdapter({
    providerName: registration.displayName,
    options,
    resolveApiKey: apiKey,
    resolveUserId: () => userId ??= getOrCreateAnonymousUserId(),
  })
  ctx.llm.registerConfigurableProviders([{
    provider: registration.provider,
    displayName: registration.displayName,
    settingsNs: registration.settingsNs,
    settingsPath: [],
  }])
  const route = ctx.llm.registerAdapter([registration.provider], adapter)
  let registeredPolicy = options().retryPolicy
  const ensureRegistrationFacts = (): void => {
    const policy = options().retryPolicy
    if (deepEqualJson(policy, registeredPolicy)) return
    route.replace([registration.provider])
    registeredPolicy = policy
  }

  const discover = registration.discoverModels
  if (discover !== undefined) {
    ctx.llm.registerModelDiscovery(
      registration.settingsNs,
      request => discover(
        request,
        async () => apiKey(options()),
        options(),
      ),
    )
  }
  installSettingsSection(ctx, registration.settingsNs, registration.schema, config, {
    setSource: (source) => {
      current = source
    },
    onChange: ensureRegistrationFacts,
  })
}
