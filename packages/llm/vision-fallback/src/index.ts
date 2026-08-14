/**
 * Vision Fallback plugin for DeepSeek Harness (`@deepseek-ai/dsh-vision-fallback`).
 * Provides automatic vision-model fallback for text-only LLMs (such as DeepSeek-V3/R1).
 *
 * @module @deepseek-ai/dsh-vision-fallback
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, Message } from '@deepseek-ai/dsh-llm'
import type { VisionDescriptionOptions, VisionFallback, VisionFallbackConfig } from './types.ts'

export type { VisionDescriptionOptions, VisionFallback, VisionFallbackConfig } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    visionFallback: VisionFallbackService
  }
}

const DEFAULT_PROMPT =
  'Please provide a detailed, accurate, and comprehensive description of the provided image for a text-only AI assistant. '
  + 'Transcribe all visible text (OCR), describe diagrams, user interfaces, code snippets, charts, tables, numbers, layout, and visual components '
  + 'so that the text model can understand and reason about the image as if it could see it directly.'

export const Config: z<VisionFallbackConfig> = z.object({
  fallbackProvider: z.string().description('Fallback provider override (e.g. opencodex, anthropic, openai)'),
  fallbackModel: z.string().description('Fallback model override (e.g. gpt-5.6-sol, claude-3-7-sonnet)'),
  maxTokens: z.number().default(2048).description('Max tokens for the image description call'),
  prompt: z.string().description('Custom vision description system instruction'),
  enabled: z.boolean().default(true).description('Enable vision fallback'),
})

/** Priority fallback model candidates when auto-detecting a vision model */
const PREFERRED_VISION_MODELS = [
  // OpenCodex proxy models
  { provider: 'opencodex', model: 'gpt-5.6-sol' },
  { provider: 'opencodex', model: 'gpt-5.6-terra' },
  { provider: 'opencodex', model: 'gpt-5.6-luna' },
  { provider: 'opencodex', model: 'claude-3-7-sonnet' },
  { provider: 'opencodex', model: 'claude-3-5-sonnet' },
  { provider: 'opencodex', model: 'commandcode/google/gemini-3.7-flash' },
  { provider: 'opencodex', model: 'minimax/MiniMax-M3' },
  { provider: 'opencodex', model: 'zai/glm-5.2' },
  { provider: 'opencodex', model: 'xai/grok-4.6' },
  { provider: 'opencodex', model: 'xai/grok-4.5' },
  { provider: 'opencodex', model: 'commandcode/gpt-5.6-luna' },
  { provider: 'opencodex', model: 'commandcode/Qwen/Qwen3.8-Max' },
  // Pi-ai provider models
  { provider: 'anthropic', model: 'claude-3-7-sonnet-latest' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-latest' },
  { provider: 'openai', model: 'gpt-4o' },
  { provider: 'openai', model: 'gpt-4o-mini' },
  { provider: 'google', model: 'gemini-1.5-pro-latest' },
  { provider: 'google', model: 'gemini-1.5-flash-latest' },
]

export class VisionFallbackService extends Service implements VisionFallback {
  static Config: z<VisionFallbackConfig> = Config
  static inject = ['llm', 'attachments']

  private readonly descriptionCache = new Map<string, string>()

  constructor(
    ctx: Context,
    public readonly config: VisionFallbackConfig = {},
  ) {
    super(ctx, 'visionFallback')
  }

  /** Check if a specific model route supports image input. */
  async isVisionCapable(provider: string, model: string, signal?: AbortSignal): Promise<boolean> {
    const llm = this.ctx.get('llm')
    if (!llm) return false
    try {
      const modelInfo = await llm.resolveModelInfo(provider, model, signal)
      return Boolean(modelInfo.inputModalities?.includes('image'))
    } catch {
      return false
    }
  }

  /** Find the best available vision fallback model route. */
  async findFallbackRoute(signal?: AbortSignal): Promise<{ provider: string; model: string } | undefined> {
    const llm = this.ctx.get('llm')
    if (!llm) return undefined

    if (this.config.fallbackProvider && this.config.fallbackModel) {
      return { provider: this.config.fallbackProvider, model: this.config.fallbackModel }
    }

    // 1. Check preferred vision models in order
    for (const candidate of PREFERRED_VISION_MODELS) {
      if (signal?.aborted) return undefined
      try {
        const info = await llm.resolveModelInfo(candidate.provider, candidate.model, signal)
        if (info.inputModalities?.includes('image')) {
          return candidate
        }
      } catch {
        // Candidate not available on current deployment, continue to next
      }
    }

    // 2. Search configured providers dynamically
    const providers = ['opencodex', 'anthropic', 'openai', 'google']
    for (const provider of providers) {
      if (signal?.aborted) return undefined
      try {
        const models = await llm.listModels(provider)
        const visionModel = models.find(m => m.inputModalities?.includes('image'))
        if (visionModel) {
          return { provider, model: visionModel.id }
        }
      } catch {
        // Provider not registered or failed
      }
    }

    return undefined
  }

  /** Describe a single image attachment using the vision fallback model. */
  async describeImage(attachment: ImageAttachmentRef, options?: VisionDescriptionOptions): Promise<string> {
    const cacheKey = String(attachment.attachmentId)
    const cached = this.descriptionCache.get(cacheKey)
    if (cached !== undefined) return cached

    const route = await this.findFallbackRoute(options?.signal)
    if (!route) {
      const fallbackSummary = `[Image: ${attachment.name || attachment.attachmentId} (Format: ${attachment.mediaType}, ${attachment.width}x${attachment.height}px, ${attachment.bytes} bytes)]`
      this.descriptionCache.set(cacheKey, fallbackSummary)
      return fallbackSummary
    }

    const llm = this.ctx.get('llm')
    if (!llm) {
      const fallbackSummary = `[Image: ${attachment.name || attachment.attachmentId} (Format: ${attachment.mediaType}, ${attachment.width}x${attachment.height}px, ${attachment.bytes} bytes)]`
      this.descriptionCache.set(cacheKey, fallbackSummary)
      return fallbackSummary
    }

    const instruction = options?.userPrompt
      ? `The user is asking: "${options.userPrompt}".\nPlease analyze this image thoroughly with full attention to any visual details, text, diagrams, or numbers relevant to answering the user's question accurately.`
      : (this.config.prompt || DEFAULT_PROMPT)

    const userMessage: Message = createUserMessage({
      source: { kind: 'plugin', plugin: 'vision-fallback' },
      content: [
        {
          type: 'image',
          attachment,
        },
        {
          type: 'text',
          text: instruction,
        },
      ],
    })

    const generateOptions: GenerateOptions = {
      provider: route.provider,
      model: route.model,
      messages: [userMessage],
      maxTokens: this.config.maxTokens ?? 2048,
      ...options?.signal === undefined ? {} : { signal: options.signal },
    }

    let description = ''
    try {
      const prepared = await llm.prepareCall({ provider: route.provider, model: route.model }, options?.signal)
      for await (const chunk of prepared.stream(generateOptions)) {
        if (chunk.type === 'text-delta') {
          description += chunk.text
        }
      }
    } catch (error: unknown) {
      this.ctx.logger?.warn?.(`vision-fallback: failed to describe image via ${route.provider}/${route.model}: ${String(error)}`)
      description = `[Image: ${attachment.name || attachment.attachmentId} (${attachment.mediaType}) - Visual inspection unavailable: ${error instanceof Error ? error.message : String(error)}]`
    }

    const result = description.trim() || `[Image: ${attachment.name || attachment.attachmentId} (${attachment.mediaType})]`
    this.descriptionCache.set(cacheKey, result)
    return result
  }

  /**
   * Recursively transform content blocks for a text-only model by replacing
   * any image block with an annotated text description from the vision model.
   */
  async transformContentForTextModel(
    content: readonly ContentBlock[],
    options?: VisionDescriptionOptions,
  ): Promise<ContentBlock[]> {
    const transformed: ContentBlock[] = []
    for (const block of content) {
      if (block.type === 'image') {
        const description = await this.describeImage(block.attachment, options)
        const header = block.attachment.name ? `[Image: ${block.attachment.name}]` : `[Image: ${block.attachment.attachmentId}]`
        transformed.push({
          type: 'text',
          text: `\n${header}\n[Visual Description (via Vision Fallback)]:\n${description}\n`,
        })
      } else if (block.type === 'tool-result') {
        const nested = await this.transformContentForTextModel(block.content, options)
        transformed.push({
          ...block,
          content: nested,
        })
      } else {
        transformed.push(block)
      }
    }
    return transformed
  }

  /**
   * Transform an array of messages so any image blocks are replaced with
   * rich visual descriptions, making it 100% safe for text-only LLMs.
   */
  async transformMessagesForTextModel(
    messages: readonly Message[],
    options?: VisionDescriptionOptions,
  ): Promise<Message[]> {
    const result: Message[] = []
    for (const message of messages) {
      const newContent = await this.transformContentForTextModel(message.content, options)
      result.push({
        ...message,
        content: newContent,
      })
    }
    return result
  }
}

export default VisionFallbackService
