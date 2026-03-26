import type { ILLMProvider } from '../ai/runner/llm-provider.js'
import { AISdkProvider, type AISdkProviderType } from '../ai/runner/ai-sdk-provider.js'

export interface LLMConfig {
  provider: AISdkProviderType
  api_key: string
  model: string
  base_url?: string
  resource_name?: string
  region?: string
  access_key_id?: string
  secret_access_key?: string
}

const STORAGE_KEY = 'lorecraft:llm-config'

export function loadLLMConfig(): LLMConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function createProviderFromConfig(config: LLMConfig): ILLMProvider {
  return new AISdkProvider({
    provider: config.provider,
    apiKey: config.api_key,
    model: config.model || '',
    baseURL: config.base_url,
    resourceName: config.resource_name,
    region: config.region,
    accessKeyId: config.access_key_id,
    secretAccessKey: config.secret_access_key,
  })
}

export async function testLLMConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  try {
    const provider = createProviderFromConfig(config)
    await provider.call(
      [{ role: 'user', content: 'Reply with OK' }],
      { max_tokens: 4, temperature: 0 },
    )
    return { success: true, message: '连接成功' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: msg }
  }
}

/** Known models for providers without list API */
const KNOWN_MODELS: Partial<Record<AISdkProviderType, string[]>> = {
  xai: [
    'grok-4', 'grok-4-0709',
    'grok-4.20-0309-reasoning', 'grok-4-1-fast-reasoning',
    'grok-4.20-multi-agent-0309',
    'grok-4.20-0309-non-reasoning', 'grok-4-1-fast-non-reasoning',
  ],
  anthropic: [
    'claude-opus-4-20250514', 'claude-sonnet-4-20250514',
    'claude-haiku-4-20250414',
    'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
  ],
  mistral: [
    'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
    'codestral-latest', 'open-mistral-nemo',
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  groq: [
    'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
    'mixtral-8x7b-32768', 'gemma2-9b-it',
  ],
  cohere: ['command-r-plus', 'command-r', 'command-light'],
  perplexity: ['sonar-pro', 'sonar', 'sonar-deep-research'],
  togetherai: [
    'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
    'deepseek-ai/DeepSeek-R1',
  ],
}

export async function listModels(config: Pick<LLMConfig, 'provider' | 'api_key' | 'base_url'>): Promise<string[]> {
  if (KNOWN_MODELS[config.provider]) {
    return KNOWN_MODELS[config.provider]!
  }

  if (config.provider === 'openai_compatible' || config.provider === 'openai') {
    const baseUrl = config.base_url || 'https://api.openai.com/v1'
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    })
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
    const data = await res.json() as { data?: Array<{ id: string }> }
    return (data.data ?? []).map(m => m.id).sort()
  }

  if (config.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.api_key}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
    const data = await res.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> }
    return (data.models ?? [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .sort()
  }

  return []
}
