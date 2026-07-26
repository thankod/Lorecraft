import { afterEach, describe, expect, it, vi } from 'vitest'
import { AISdkProvider } from './ai-sdk-provider.js'

function openAIChatResponse(): Response {
  return new Response(JSON.stringify({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 0,
    model: 'test-model',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'OK' },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 4,
      completion_tokens: 1,
      total_tokens: 5,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('AISdkProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses Chat Completions for OpenAI-compatible providers', async () => {
    const requestedUrls: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      requestedUrls.push(String(input))
      return openAIChatResponse()
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new AISdkProvider({
      provider: 'openai_compatible',
      apiKey: 'test-key',
      model: 'deepseek-ai/DeepSeek-V3.2',
      baseURL: 'https://api.siliconflow.cn/v1',
    })

    const response = await provider.call([
      { role: 'user', content: 'Reply with OK' },
    ], {
      max_tokens: 4,
      temperature: 0,
    })

    expect(response.content).toBe('OK')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(requestedUrls[0]).toBe(
      'https://api.siliconflow.cn/v1/chat/completions',
    )
  })
})
