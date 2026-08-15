/**
 * Live mux backlog behavior: a slow consumer retains every session event in
 * order, while abort stops delivery immediately instead of draining stale
 * frames after the connection has gone away.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SessionStore from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import type { MuxFrame, RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '@deepseek-ai/dsh-host-apiproxy'

async function harness(): Promise<{
  ctx: Context
  stream: AsyncIterable<RpcRequest<MuxFrame>>
  abort: AbortController
}> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  ctx.sessions.create()
  const proxy = createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
    cwd: '/tmp',
  })
  const abort = new AbortController()
  return {
    ctx,
    stream: proxy.events.mux({ rpcId: RpcId('stream-backlog'), payload: {} }, abort.signal),
    abort,
  }
}

describe('mux streaming backlog', () => {
  it('drains a 20,000-event burst in exact session order', async () => {
    const { ctx, stream, abort } = await harness()
    const iterator = stream[Symbol.asyncIterator]()
    const subscribed = await iterator.next()
    if (subscribed.done) throw new Error('mux ended before the subscription baseline')
    expect(subscribed.value.payload.type).toBe('session/subscribed')

    const session = ctx.sessions.list()[0]
    if (session === undefined) throw new Error('streaming harness session missing')
    const total = 20_000
    for (let index = 0; index < total; index += 1) {
      session.append('assistant/chunk', {
        turn: 1,
        step: 0,
        chunk: { type: 'text-delta', index: 0, text: String(index) },
      })
    }

    const sequence: number[] = []
    for (let index = 0; index < total; index += 1) {
      const next = await iterator.next()
      if (next.done || next.value.payload.type !== 'session/event') {
        throw new Error(`mux ended before event ${String(index)}`)
      }
      sequence.push(next.value.payload.event.seq)
    }
    expect(sequence).toEqual(Array.from({ length: total }, (_value, index) => index))

    abort.abort()
    expect((await iterator.next()).done).toBe(true)
  })

  it('drops an accumulated backlog as soon as the connection aborts', async () => {
    const { ctx, stream, abort } = await harness()
    const iterator = stream[Symbol.asyncIterator]()
    await iterator.next()
    const session = ctx.sessions.list()[0]
    if (session === undefined) throw new Error('streaming harness session missing')
    for (let index = 0; index < 100; index += 1) {
      session.append('assistant/chunk', {
        turn: 1,
        step: 0,
        chunk: { type: 'text-delta', index: 0, text: String(index) },
      })
    }

    abort.abort()
    expect((await iterator.next()).done).toBe(true)
  })
})
