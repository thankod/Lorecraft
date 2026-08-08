import { afterEach, describe, expect, it, vi } from 'vitest'
import { AISdkProvider } from './ai-sdk-provider.js'

function openAIChatResponse(message: Record<string, unknown> = { role: 'assistant', content: 'OK' }): Response {
  return new Response(JSON.stringify({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 0,
    model: 'test-model',
    choices: [{
      index: 0,
      message,
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

  it('recovers valid JSON returned only in reasoning_content', async () => {
    const fetchMock = vi.fn(async () => openAIChatResponse({
      role: 'assistant',
      content: null,
      reasoning_content: 'Analysis first. Final payload: {"ok":true}',
    }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new AISdkProvider({
      provider: 'openai_compatible',
      apiKey: 'test-key',
      model: 'deepseek-ai/DeepSeek-R1',
      baseURL: 'https://api.siliconflow.cn/v1',
    })

    const response = await provider.call([{ role: 'user', content: 'Return JSON' }])
    expect(response.content).toBe('{"ok":true}')
    expect(response.finish_reason).toBe('stop')
  })

  it('reports response metadata instead of returning an empty string', async () => {
    const fetchMock = vi.fn(async () => openAIChatResponse({
      role: 'assistant',
      content: null,
      reasoning_content: 'I considered the request but did not produce a final answer.',
    }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new AISdkProvider({
      provider: 'openai_compatible',
      apiKey: 'test-key',
      model: 'deepseek-ai/DeepSeek-R1',
      baseURL: 'https://api.siliconflow.cn/v1',
    })

    await expect(provider.call([{ role: 'user', content: 'Return JSON' }]))
      .rejects.toThrow(/no usable final text.*finish=stop.*output_tokens=1/i)
  })
})
