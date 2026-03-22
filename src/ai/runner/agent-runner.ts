import type { ILLMProvider, LLMMessage, LLMResponse } from './llm-provider.js'

export interface LLMCallLog {
  call_id: string
  agent_type: string
  input_hash: string
  output_hash: string
  duration_ms: number
  status: 'success' | 'error'
  error?: string
  timestamp: number
}

export interface AgentRunnerOptions {
  timeout_ms?: number
  max_retries?: number
  base_delay_ms?: number
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

let callCounter = 0

export class AgentRunner {
  private provider: ILLMProvider
  private logs: LLMCallLog[] = []
  private timeout: number
  private maxRetries: number
  private baseDelay: number

  constructor(provider: ILLMProvider, options?: AgentRunnerOptions) {
    this.provider = provider
    this.timeout = options?.timeout_ms ?? 30_000
    this.maxRetries = options?.max_retries ?? 3
    this.baseDelay = options?.base_delay_ms ?? 1_000
  }

  async run(
    messages: LLMMessage[],
    options?: { temperature?: number; max_tokens?: number; agent_type?: string },
  ): Promise<LLMResponse> {
    const callId = `call_${Date.now()}_${++callCounter}`
    const agentType = options?.agent_type ?? 'unknown'
    const inputHash = simpleHash(JSON.stringify(messages))
    const start = Date.now()

    let lastError: Error | undefined

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.callWithTimeout(messages, options)
        const duration = Date.now() - start

        this.logs.push({
          call_id: callId,
          agent_type: agentType,
          input_hash: inputHash,
          output_hash: simpleHash(response.content),
          duration_ms: duration,
          status: 'success',
          timestamp: Date.now(),
        })

        return response
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    const duration = Date.now() - start
    this.logs.push({
      call_id: callId,
      agent_type: agentType,
      input_hash: inputHash,
      output_hash: '',
      duration_ms: duration,
      status: 'error',
      error: lastError?.message,
      timestamp: Date.now(),
    })

    throw lastError
  }

  getLogs(): readonly LLMCallLog[] {
    return this.logs
  }

  private callWithTimeout(
    messages: LLMMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('LLM call timed out')), this.timeout)

      this.provider
        .call(messages, options)
        .then((res) => {
          clearTimeout(timer)
          resolve(res)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }
}
