import Anthropic from '@anthropic-ai/sdk'
import type { ILLMProvider, LLMMessage, LLMResponse } from './llm-provider.js'

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

export interface AnthropicProviderOptions {
  apiKey: string
  model?: string
}

export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic
  private model: string

  constructor(options: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey })
    this.model = options.model ?? DEFAULT_MODEL
  }

  async call(
    messages: LLMMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === 'system')
    const nonSystemMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.max_tokens ?? 4096,
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(systemMessage && { system: systemMessage.content }),
      messages: nonSystemMessages,
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return {
      content: text,
      usage: response.usage
        ? {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          }
        : undefined,
    }
  }
}
