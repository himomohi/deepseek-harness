import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef, StoredImageAttachment } from '@deepseek-ai/dsh-attachment'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { VisionFallbackService } from '../src/index.ts'

function makeMockAttachment(id = 'img-123', name = 'diagram.png'): ImageAttachmentRef {
  return {
    attachmentId: AttachmentId(id),
    mediaType: 'image/png',
    bytes: 1024,
    width: 800,
    height: 600,
    name,
  }
}

class MockLlmService extends Service {
  constructor(ctx: Context, private readonly models: LlmModelInfo[] = []) {
    super(ctx, 'llm')
  }

  async resolveModelInfo(provider: string, model: string): Promise<LlmModelInfo> {
    const found = this.models.find(m => m.provider === provider && m.id === model)
    if (found) return found
    if (model.includes('vision') || model.includes('gpt-5') || model.includes('claude')) {
      return { provider, id: model, name: model, inputModalities: ['text', 'image'] }
    }
    return { provider, id: model, name: model, inputModalities: ['text'] }
  }

  async listModels(provider: string): Promise<LlmModelInfo[]> {
    return this.models.filter(m => m.provider === provider)
  }

  async prepareCall(config: { provider: string; model: string }) {
    return {
      stream: async function* (_options: GenerateOptions): AsyncGenerator<StreamChunk> {
        yield { type: 'text-delta', index: 0, text: `Detailed visual description of image via ${config.model}` }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    }
  }
}

class MockAttachmentService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'attachments')
  }

  async readImage(ref: ImageAttachmentRef): Promise<StoredImageAttachment> {
    return { data: new Uint8Array([1, 2, 3]), ref }
  }
}

describe('VisionFallbackService', () => {
  it('detects vision capability accurately', async () => {
    const ctx = new Context()
    new MockLlmService(ctx, [
      { provider: 'opencodex', id: 'gpt-5.6-sol', name: 'GPT 5.6', inputModalities: ['text', 'image'] },
      { provider: 'deepseek', id: 'deepseek-chat', name: 'DeepSeek', inputModalities: ['text'] },
    ])
    new MockAttachmentService(ctx)
    const service = new VisionFallbackService(ctx)

    expect(await service.isVisionCapable('opencodex', 'gpt-5.6-sol')).toBe(true)
    expect(await service.isVisionCapable('deepseek', 'deepseek-chat')).toBe(false)
  })

  it('finds vision fallback route and generates image descriptions', async () => {
    const ctx = new Context()
    new MockLlmService(ctx, [
      { provider: 'opencodex', id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', inputModalities: ['text', 'image'] },
    ])
    new MockAttachmentService(ctx)
    const service = new VisionFallbackService(ctx)
    const attachment = makeMockAttachment('test-att-1', 'screenshot.png')

    const description = await service.describeImage(attachment)
    expect(description).toBe('Detailed visual description of image via gpt-5.6-sol')

    // Second call should return from cache
    const cachedDescription = await service.describeImage(attachment)
    expect(cachedDescription).toBe('Detailed visual description of image via gpt-5.6-sol')
  })

  it('transforms messages containing image blocks into text descriptions', async () => {
    const ctx = new Context()
    new MockLlmService(ctx, [
      { provider: 'opencodex', id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', inputModalities: ['text', 'image'] },
    ])
    new MockAttachmentService(ctx)
    const service = new VisionFallbackService(ctx)

    const userMessage = createUserMessage({
      source: { kind: 'user' },
      content: [
        { type: 'text', text: 'Can you see this image?' },
        { type: 'image', attachment: makeMockAttachment('att-1', 'login.png') },
      ],
    })

    const transformed = await service.transformMessagesForTextModel([userMessage])
    expect(transformed).toHaveLength(1)
    const firstMessage = transformed[0]
    expect(firstMessage).toBeDefined()
    expect(firstMessage!.content).toHaveLength(2)
    expect(firstMessage!.content[0]).toEqual({ type: 'text', text: 'Can you see this image?' })
    expect(firstMessage!.content[1]?.type).toBe('text')
    expect((firstMessage!.content[1] as { text: string }).text).toContain('[Visual Description (via Vision Fallback)]')
    expect((firstMessage!.content[1] as { text: string }).text).toContain('Detailed visual description of image via gpt-5.6-sol')
  })
})
