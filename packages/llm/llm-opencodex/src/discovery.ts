/**
 * Model discovery for OpenCodex Proxy (`GET /models`).
 * Queries the local/remote OpenCodex instance for available models.
 *
 * @module dsh-llm-opencodex/discovery
 */

import { LlmError, type LlmDiscoveredModel, type LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'

interface ListingEntry {
  id?: unknown
  name?: unknown
  display_name?: unknown
  context_window?: unknown
  context_length?: unknown
  max_tokens?: unknown
  max_output_tokens?: unknown
}

function capacity(...candidates: readonly unknown[]): number | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) return candidate
  }
  return undefined
}

function label(...candidates: readonly unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate
  }
  return undefined
}

function listingUrl(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, '')}/models`
}

export async function discoverModels(
  request: LlmModelDiscoveryRequest,
  apiKeyResolver: () => Promise<string | undefined>,
): Promise<readonly LlmDiscoveredModel[]> {
  const baseURL = request.baseURL ?? 'http://127.0.0.1:10100/v1'
  const url = listingUrl(baseURL)
  const apiKey = request.apiKey ?? (await apiKeyResolver()) ?? 'local-opencodex'
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

  const entries: ListingEntry[] = Array.isArray(body)
    ? body as ListingEntry[]
    : (typeof body === 'object' && body !== null && Array.isArray((body as { data?: unknown }).data))
      ? (body as { data: ListingEntry[] }).data
      : []

  return entries
    .filter((entry): entry is ListingEntry & { id: string } => typeof entry.id === 'string' && entry.id.length > 0)
    .map((entry) => {
      const displayName = label(entry.display_name, entry.name)
      const contextWindow = capacity(entry.context_window, entry.context_length) ?? 200_000
      const maxTokens = capacity(entry.max_output_tokens, entry.max_tokens) ?? 8_192
      return {
        id: entry.id,
        ...displayName === undefined ? {} : { name: displayName },
        contextWindow,
        maxTokens,
      }
    })
}
