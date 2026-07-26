import { afterEach, describe, expect, it, vi } from 'vitest'
import { listModels } from './llm-config.js'
import { ClientMessageSchema } from './protocol.js'

describe('LLM configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the current model IDs from the DeepSeek API', async () => {
    const requestedUrls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      requestedUrls.push(String(input))
      return new Response(JSON.stringify({
        object: 'list',
        data: [
          { id: 'deepseek-v4-pro', object: 'model', owned_by: 'deepseek' },
          { id: 'deepseek-v4-flash', object: 'model', owned_by: 'deepseek' },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    await expect(listModels({
      provider: 'deepseek',
      api_key: 'test-key',
    })).resolves.toEqual([
      'deepseek-v4-flash',
      'deepseek-v4-pro',
    ])
    expect(requestedUrls).toEqual(['https://api.deepseek.com/models'])
  })

  it.each([
    'set_llm_config',
    'test_llm_config',
    'list_models',
  ] as const)('accepts DeepSeek in %s messages', (type) => {
    const message = type === 'list_models'
      ? { type, provider: 'deepseek', api_key: 'test-key' }
      : { type, provider: 'deepseek', api_key: 'test-key', model: 'deepseek-v4-flash' }

    expect(ClientMessageSchema.safeParse(message).success).toBe(true)
  })
})
