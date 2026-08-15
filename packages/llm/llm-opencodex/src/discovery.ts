/**
 * Model discovery for OpenCodex Proxy (`GET /models`).
 * Queries the local/remote OpenCodex instance for available models.
 *
 * @module dsh-llm-opencodex/discovery
 */

import {
  assertUsableApiKey,
  LlmError,
  type LlmDiscoveredModel,
  type LlmModelDiscoveryRequest,
} from '@deepseek-ai/dsh-llm'

interface ListingEntry {
  id?: unknown
  name?: unknown
  display_name?: unknown
  context_window?: unknown
  context_length?: unknown
  max_tokens?: unknown
  max_output_tokens?: unknown
}

function firstString(values: readonly unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

function firstCapacity(values: readonly unknown[]): number | undefined {
  return values.find(
    (value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0,
  )
}

function listingUrl(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, '')}/models`
}

/**
 * Query the OpenCodex proxy's OpenAI-compatible model listing.
 * @param request - draft endpoint, credential, and cancellation signal.
 * @param apiKeyResolver - stored credential lookup used when the draft omits one.
 * @returns valid listing rows in proxy order.
 */
export async function discoverModels(
  request: LlmModelDiscoveryRequest,
  apiKeyResolver: () => Promise<string | undefined>,
): Promise<readonly LlmDiscoveredModel[]> {
  const baseURL = request.baseURL ?? 'http://127.0.0.1:10100/v1'
  const url = listingUrl(baseURL)
  const resolvedKey = request.apiKey ?? (await apiKeyResolver()) ?? 'local-opencodex'
  const apiKey = resolvedKey.length === 0
    ? ''
    : assertUsableApiKey(resolvedKey, 'llm-opencodex', 'model discovery credential')
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(apiKey.length > 0 ? { authorization: `Bearer ${apiKey}` } : {}),
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      ...request.signal === undefined ? {} : { signal: request.signal },
    })
  } catch (error: unknown) {
    if (request.signal?.aborted) throw error
    throw new LlmError(`Failed to fetch models from ${url}`, 'TRANSPORT', { cause: error })
  }

  if (!response.ok) {
    throw new LlmError(`OpenCodex proxy at ${url} answered with HTTP ${response.status}`, 'DISCOVERY_FAILED')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (error: unknown) {
    throw new LlmError(`Failed to parse model list from ${url}`, 'DISCOVERY_FAILED', { cause: error })
  }

  const entries: ListingEntry[] | undefined = Array.isArray(body)
    ? body as ListingEntry[]
    : (typeof body === 'object' && body !== null && Array.isArray((body as { data?: unknown }).data))
      ? (body as { data: ListingEntry[] }).data
      : undefined
  if (entries === undefined) {
    throw new LlmError(`OpenCodex proxy at ${url} returned no model array`, 'DISCOVERY_FAILED')
  }

  const models: LlmDiscoveredModel[] = []
  for (const entry of entries) {
    const id = firstString([entry.id])
    if (id === undefined) continue
    const name = firstString([entry.display_name, entry.name])
    const contextWindow = firstCapacity([entry.context_window, entry.context_length])
    const maxTokens = firstCapacity([entry.max_output_tokens, entry.max_tokens])
    models.push({
      id,
      ...name === undefined ? {} : { name },
      ...contextWindow === undefined ? {} : { contextWindow },
      ...maxTokens === undefined ? {} : { maxTokens },
    })
  }
  return models
}
