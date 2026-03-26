import OpenAI from 'openai'
import { HttpsProxyAgent } from 'https-proxy-agent'
import type { ILLMProvider, LLMMessage, LLMResponse } from './llm-provider.js'

const DEFAULT_MODEL = 'gpt-4o-mini'

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl =
    process.env.https_proxy ??
    process.env.HTTPS_PROXY ??
    process.env.http_proxy ??
    process.env.HTTP_PROXY ??
    process.env.ALL_PROXY
  return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
}

export interface OpenAIProviderOptions {
  apiKey: string
  model?: string
  baseURL?: string
}

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI
  private model: string

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      ...(options.baseURL && { baseURL: options.baseURL }),
      httpAgent: getProxyAgent(),
    })
    this.model = options.model ?? DEFAULT_MODEL
  }

  async call(
    messages: LLMMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<LLMResponse> {
    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(
      (m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })
    )

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: formattedMessages,
      max_tokens: options?.max_tokens ?? 4096,
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
    })

    const text = response.choices[0]?.message?.content ?? ''

    return {
      content: text,
      usage: response.usage
        ? {
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens,
          }
        : undefined,
    }
  }
}
