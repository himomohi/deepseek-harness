/**
 * Vision Fallback vocabulary and service types.
 *
 * @module @deepseek-ai/dsh-vision-fallback/types
 */

import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock, Message } from '@deepseek-ai/dsh-llm'

/** Config schema for Vision Fallback plugin. */
export interface VisionFallbackConfig {
  /** Explicit fallback provider override (e.g. 'opencodex', 'anthropic', 'openai'). */
  fallbackProvider?: string
  /** Explicit fallback model override (e.g. 'gpt-5.6-sol', 'claude-3-7-sonnet'). */
  fallbackModel?: string
  /** Output token cap for the image description request. Defaults to 2048. */
  maxTokens?: number
  /** Custom system prompt directing the vision model description quality. */
  prompt?: string
  /** Enable or disable vision fallback. Defaults to true. */
  enabled?: boolean
}

/** Options for describing an image. */
export interface VisionDescriptionOptions {
  /** Optional user prompt context accompanying the image. */
  userPrompt?: string
  /** Optional cancellation signal. */
  signal?: AbortSignal
}

/** Interface for the Vision Fallback service available at `ctx.visionFallback`. */
export interface VisionFallback {
  /** Check if a specific model route supports image input. */
  isVisionCapable(provider: string, model: string, signal?: AbortSignal): Promise<boolean>

  /** Find the best available vision fallback model route. */
  findFallbackRoute(signal?: AbortSignal): Promise<{ provider: string; model: string } | undefined>

  /** Describe a single image attachment using the vision fallback model. */
  describeImage(attachment: ImageAttachmentRef, options?: VisionDescriptionOptions): Promise<string>

  /**
   * Recursively transform content blocks for a text-only model by replacing
   * any image block with an annotated text description from the vision model.
   */
  transformContentForTextModel(content: readonly ContentBlock[], options?: VisionDescriptionOptions): Promise<ContentBlock[]>

  /**
   * Transform an array of messages so any image blocks are replaced with
   * rich visual descriptions, making it 100% safe for text-only LLMs.
   */
  transformMessagesForTextModel(messages: readonly Message[], options?: VisionDescriptionOptions): Promise<Message[]>
}
