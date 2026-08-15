import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'
import {
  OpenCodexAdapter,
  resolveAdapterOptions,
} from '../src/index.ts'
import { discoverModels } from '../src/discovery.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OpenCodex provider', () => {
  it('resolves local defaults and rejects duplicate model ids', () => {
    const resolved = resolveAdapterOptions({})
    expect(resolved.baseURL).toBe('http://127.0.0.1:10100/v1')
    expect(resolved.models[0]?.id).toBe('gpt-5.6-sol')

    expect(() => resolveAdapterOptions({
      models: [{ id: 'same' }, { id: 'same' }],
    })).toThrow(/duplicate catalog model "same"/)
  })

  it('uses the shared text-only transport without claiming unimplemented image support', async () => {
    const adapter = new OpenCodexAdapter({
      providerName: 'OpenCodex Proxy',
      options: () => resolveAdapterOptions({}),
      resolveApiKey: () => Promise.resolve('local-opencodex'),
      resolveUserId: () => '00000000-0000-4000-8000-000000000001' as AnonymousUserId,
    })

    expect(adapter.providerInfo('opencodex')).toEqual({
      id: 'opencodex',
      name: 'OpenCodex Proxy',
    })
    expect((await adapter.resolveModel('opencodex', 'gpt-5.6-sol')).inputModalities).toEqual(['text'])
  })

  it('prefers exact model caps and omits unknown output caps', async () => {
    const options = resolveAdapterOptions({
      models: [
        { id: 'known-cap', maxTokens: 131_072 },
        { id: 'unknown-cap' },
      ],
    })
    const adapter = new OpenCodexAdapter({
      providerName: 'OpenCodex Proxy',
      options: () => options,
      resolveApiKey: () => Promise.resolve('local-opencodex'),
      resolveUserId: () => '00000000-0000-4000-8000-000000000001' as AnonymousUserId,
    })

    expect(options).not.toHaveProperty('maxTokens')
    expect(await adapter.resolveModel('opencodex', 'known-cap'))
      .toMatchObject({ defaultMaxTokens: 131_072 })
    expect(await adapter.resolveModel('opencodex', 'unknown-cap'))
      .not.toHaveProperty('defaultMaxTokens')
    expect(await adapter.resolveModel('opencodex', 'uncatalogued'))
      .not.toHaveProperty('defaultMaxTokens')

    const routeOptions = resolveAdapterOptions({
      maxTokens: 65_536,
      models: [{ id: 'known-cap', maxTokens: 131_072 }],
    })
    const routeAdapter = new OpenCodexAdapter({
      providerName: 'OpenCodex Proxy',
      options: () => routeOptions,
      resolveApiKey: () => Promise.resolve('local-opencodex'),
      resolveUserId: () => '00000000-0000-4000-8000-000000000001' as AnonymousUserId,
    })
    expect(await routeAdapter.resolveModel('opencodex', 'known-cap'))
      .toMatchObject({ defaultMaxTokens: 131_072 })
    expect(await routeAdapter.resolveModel('opencodex', 'uncatalogued'))
      .toMatchObject({ defaultMaxTokens: 65_536 })
  })
})

describe('OpenCodex discovery', () => {
  it('accepts the OpenAI data envelope without inventing missing capacities', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: [
        {
          id: 'model-a',
          display_name: 'Model A',
          context_window: 1_000_000,
          max_output_tokens: 131_072,
        },
        { id: 'model-b' },
        { name: 'missing-id' },
      ],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverModels(
      { baseURL: 'http://127.0.0.1:10100/v1' },
      () => Promise.resolve('stored-token'),
    )).resolves.toEqual([
      {
        id: 'model-a',
        name: 'Model A',
        contextWindow: 1_000_000,
        maxTokens: 131_072,
      },
      { id: 'model-b' },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:10100/v1/models',
      expect.objectContaining({
        headers: {
          accept: 'application/json',
          authorization: 'Bearer stored-token',
        },
      }),
    )
  })

  it('refuses a successful response that is not a model listing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"status":"ok"}', { status: 200 })))

    await expect(discoverModels(
      { baseURL: 'http://127.0.0.1:10100/v1' },
      () => Promise.resolve(undefined),
    )).rejects.toMatchObject({ code: 'DISCOVERY_FAILED' })
  })
})
