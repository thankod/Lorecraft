import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod/v4'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ResponseParser } from './parser/response-parser.js'
import type { ParseError } from './parser/response-parser.js'
import { PromptRegistry } from './prompt/prompt-registry.js'
import { loadPromptsFromDirectory } from './prompt/prompt-loader.js'
import { TokenBudgetManager } from './context/context-assembler.js'
import type { ContextSection } from './context/context-assembler.js'
import { AgentRunner } from './runner/agent-runner.js'
import type { ILLMProvider, LLMMessage, LLMResponse } from './runner/llm-provider.js'

// ---------------------------------------------------------------------------
// ResponseParser
// ---------------------------------------------------------------------------

const TestSchema = z.object({
  action: z.string(),
  target: z.string(),
  confidence: z.number().min(0).max(1),
})

type TestData = z.infer<typeof TestSchema>

describe('ResponseParser', () => {
  let parser: ResponseParser<TestData>

  beforeEach(() => {
    parser = new ResponseParser(TestSchema)
  })

  it('parses valid JSON successfully', () => {
    const raw = '{"action":"attack","target":"npc_guard","confidence":0.85}'
    const result = parser.parse(raw)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.action).toBe('attack')
      expect(result.data.target).toBe('npc_guard')
      expect(result.data.confidence).toBe(0.85)
    }
  })

  it('extracts JSON from ```json code block', () => {
    const raw = `Here is the response:
\`\`\`json
{
  "action": "flee",
  "target": "loc_forest",
  "confidence": 0.6
}
\`\`\`
That should work.`

    const result = parser.parse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.action).toBe('flee')
    }
  })

  it('extracts JSON from ``` code block without json tag', () => {
    const raw = `\`\`\`
{"action":"negotiate","target":"npc_merchant","confidence":0.9}
\`\`\``

    const result = parser.parse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.action).toBe('negotiate')
    }
  })

  it('extracts embedded JSON object from surrounding text', () => {
    const raw = 'Sure! Here is the output: {"action":"talk","target":"npc_chief","confidence":0.5} — hope that helps!'
    const result = parser.parse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.action).toBe('talk')
    }
  })

  it('rejects invalid JSON with INVALID_JSON error type', () => {
    const raw = '{not valid json at all'
    const result = parser.parse(raw)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('INVALID_JSON')
      expect(result.error.message).toContain('Failed to parse JSON')
    }
  })

  it('rejects schema violation with SCHEMA_VIOLATION error type', () => {
    // Missing required field "target", wrong type for confidence
    const raw = '{"action":"attack","confidence":"high"}'
    const result = parser.parse(raw)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SCHEMA_VIOLATION')
      expect(result.error.message).toContain('')
    }
  })

  it('rejects when confidence is out of range (schema violation)', () => {
    const raw = '{"action":"attack","target":"npc_guard","confidence":5.0}'
    const result = parser.parse(raw)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(['SCHEMA_VIOLATION', 'ENUM_VIOLATION']).toContain(result.error.type)
    }
  })

  describe('getRetryHint', () => {
    it('returns hint for INVALID_JSON', () => {
      const error: ParseError = { type: 'INVALID_JSON', message: 'bad json' }
      const hint = parser.getRetryHint(error)
      expect(hint).toContain('not valid JSON')
    })

    it('returns hint for SCHEMA_VIOLATION with error details', () => {
      const error: ParseError = { type: 'SCHEMA_VIOLATION', message: 'target: Required' }
      const hint = parser.getRetryHint(error)
      expect(hint).toContain('Schema validation failed')
      expect(hint).toContain('target: Required')
    })

    it('returns hint for ENUM_VIOLATION with error details', () => {
      const error: ParseError = { type: 'ENUM_VIOLATION', message: 'weight: Invalid value' }
      const hint = parser.getRetryHint(error)
      expect(hint).toContain('Enum validation failed')
      expect(hint).toContain('weight: Invalid value')
    })
  })
})

// ---------------------------------------------------------------------------
// PromptRegistry
// ---------------------------------------------------------------------------

describe('PromptRegistry', () => {
  let registry: PromptRegistry
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'lorecraft-prompts-'))
    writeFileSync(join(tmpDir, 'input_parser.prompt'), 'Parse: {{player_input}} in context: {{world_context}}')
    writeFileSync(join(tmpDir, 'npc_response.prompt'), 'NPC {{npc_name}} says: {{dialogue}}')
    writeFileSync(join(tmpDir, 'not_a_prompt.txt'), 'This should be ignored')

    registry = loadPromptsFromDirectory(tmpDir)
  })

  it('loads .prompt files from directory', () => {
    const names = registry.names()
    expect(names.sort()).toEqual(['input_parser', 'npc_response'])
  })

  it('ignores non-.prompt files', () => {
    expect(registry.has('not_a_prompt')).toBe(false)
  })

  it('gets a template by name', () => {
    const template = registry.get('input_parser')
    expect(template).toContain('{{player_input}}')
    expect(template).toContain('{{world_context}}')
  })

  it('throws when getting a non-existent template', () => {
    expect(() => registry.get('nonexistent')).toThrow('Prompt template not found: nonexistent')
  })

  it('fills placeholders in a template', () => {
    const filled = registry.fill('input_parser', {
      player_input: 'I attack the guard',
      world_context: 'Dark alley at night',
    })

    expect(filled).toBe('Parse: I attack the guard in context: Dark alley at night')
  })

  it('fills multiple occurrences of the same placeholder', () => {
    writeFileSync(join(tmpDir, 'repeat.prompt'), '{{name}} meets {{name}}')
    const reg = loadPromptsFromDirectory(tmpDir)

    const filled = reg.fill('repeat', { name: 'Alice' })
    expect(filled).toBe('Alice meets Alice')
  })

  it('has() returns true for loaded templates', () => {
    expect(registry.has('input_parser')).toBe(true)
    expect(registry.has('npc_response')).toBe(true)
    expect(registry.has('missing')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TokenBudgetManager
// ---------------------------------------------------------------------------

describe('TokenBudgetManager', () => {
  it('exposes the total budget', () => {
    const manager = new TokenBudgetManager(1000)
    expect(manager.budget).toBe(1000)
  })

  it('keeps all sections when they fit within budget', () => {
    const manager = new TokenBudgetManager(10000)
    const sections: ContextSection[] = [
      { key: 'world', content: 'A dark city.', priority: 1, token_estimate: 0 },
      { key: 'npc', content: 'The chief is nervous.', priority: 2, token_estimate: 0 },
      { key: 'lore', content: 'Ancient history.', priority: 3, token_estimate: 0 },
    ]

    const result = manager.fitToBudget(sections)
    expect(result).toHaveLength(3)
  })

  it('returns sections sorted by priority ascending (original order)', () => {
    const manager = new TokenBudgetManager(10000)
    const sections: ContextSection[] = [
      { key: 'low', content: 'low priority', priority: 1, token_estimate: 0 },
      { key: 'high', content: 'high priority', priority: 3, token_estimate: 0 },
      { key: 'med', content: 'medium priority', priority: 2, token_estimate: 0 },
    ]

    const result = manager.fitToBudget(sections)
    expect(result.map(s => s.key)).toEqual(['low', 'med', 'high'])
  })

  it('drops low-priority sections when budget is exceeded', () => {
    // Budget = 10 tokens, ~40 characters.
    // Each section below is ~5-6 tokens (20-24 chars)
    const manager = new TokenBudgetManager(10)
    const sections: ContextSection[] = [
      { key: 'low', content: 'A'.repeat(40), priority: 1, token_estimate: 0 },    // ~10 tokens
      { key: 'high', content: 'B'.repeat(24), priority: 3, token_estimate: 0 },   // ~6 tokens
      { key: 'med', content: 'C'.repeat(16), priority: 2, token_estimate: 0 },    // ~4 tokens
    ]

    const result = manager.fitToBudget(sections)
    // high (6 tokens) fits, med (4 tokens) fits = 10. low is dropped or truncated.
    const keys = result.map(s => s.key)
    expect(keys).toContain('high')
    expect(keys).toContain('med')
  })

  it('truncates partial section when only part fits', () => {
    // Budget = 5 tokens = 20 chars capacity
    const manager = new TokenBudgetManager(5)
    const sections: ContextSection[] = [
      { key: 'big', content: 'X'.repeat(80), priority: 1, token_estimate: 0 }, // 20 tokens, way over
    ]

    const result = manager.fitToBudget(sections)
    expect(result).toHaveLength(1)
    // Content should be truncated to fit budget
    expect(result[0].content.length).toBeLessThanOrEqual(20)
    expect(result[0].token_estimate).toBe(5)
  })

  it('handles empty sections array', () => {
    const manager = new TokenBudgetManager(1000)
    const result = manager.fitToBudget([])
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// AgentRunner (with mock ILLMProvider)
// ---------------------------------------------------------------------------

class MockLLMProvider implements ILLMProvider {
  private callCount = 0
  private failuresBeforeSuccess: number
  private response: LLMResponse
  private errorMessage: string

  constructor(opts: { failuresBeforeSuccess?: number; response?: LLMResponse; errorMessage?: string } = {}) {
    this.failuresBeforeSuccess = opts.failuresBeforeSuccess ?? 0
    this.response = opts.response ?? { content: '{"result":"ok"}', usage: { input_tokens: 100, output_tokens: 50 } }
    this.errorMessage = opts.errorMessage ?? 'LLM service unavailable'
  }

  async call(_messages: LLMMessage[], _options?: { temperature?: number; max_tokens?: number }): Promise<LLMResponse> {
    this.callCount++
    if (this.callCount <= this.failuresBeforeSuccess) {
      throw new Error(this.errorMessage)
    }
    return this.response
  }

  getCallCount(): number {
    return this.callCount
  }
}

describe('AgentRunner', () => {
  it('returns response on successful first call', async () => {
    const provider = new MockLLMProvider()
    const runner = new AgentRunner(provider, { max_retries: 3, base_delay_ms: 1, timeout_ms: 5000 })

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a game master.' },
      { role: 'user', content: 'What happens next?' },
    ]

    const response = await runner.run(messages, { agent_type: 'narrator' })
    expect(response.content).toBe('{"result":"ok"}')
    expect(response.usage?.input_tokens).toBe(100)

    const logs = runner.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].status).toBe('success')
    expect(logs[0].agent_type).toBe('narrator')
  })

  it('retries on failure and succeeds eventually', async () => {
    const provider = new MockLLMProvider({ failuresBeforeSuccess: 2 })
    const runner = new AgentRunner(provider, { max_retries: 3, base_delay_ms: 1, timeout_ms: 5000 })

    const messages: LLMMessage[] = [{ role: 'user', content: 'test' }]
    const response = await runner.run(messages)

    expect(response.content).toBe('{"result":"ok"}')
    expect(provider.getCallCount()).toBe(3) // 2 failures + 1 success

    const logs = runner.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].status).toBe('success')
  })

  it('throws after max retries exceeded and logs error', async () => {
    const provider = new MockLLMProvider({ failuresBeforeSuccess: 10, errorMessage: 'rate limited' })
    const runner = new AgentRunner(provider, { max_retries: 3, base_delay_ms: 1, timeout_ms: 5000 })

    const messages: LLMMessage[] = [{ role: 'user', content: 'test' }]

    await expect(runner.run(messages, { agent_type: 'npc_agent' })).rejects.toThrow('rate limited')
    expect(provider.getCallCount()).toBe(3)

    const logs = runner.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].status).toBe('error')
    expect(logs[0].error).toBe('rate limited')
    expect(logs[0].agent_type).toBe('npc_agent')
  })

  it('defaults agent_type to unknown when not specified', async () => {
    const provider = new MockLLMProvider()
    const runner = new AgentRunner(provider, { max_retries: 1, base_delay_ms: 1, timeout_ms: 5000 })

    await runner.run([{ role: 'user', content: 'hi' }])

    const logs = runner.getLogs()
    expect(logs[0].agent_type).toBe('unknown')
  })

  it('accumulates logs across multiple calls', async () => {
    const provider = new MockLLMProvider()
    const runner = new AgentRunner(provider, { max_retries: 1, base_delay_ms: 1, timeout_ms: 5000 })

    await runner.run([{ role: 'user', content: 'call 1' }], { agent_type: 'agent_a' })
    await runner.run([{ role: 'user', content: 'call 2' }], { agent_type: 'agent_b' })

    const logs = runner.getLogs()
    expect(logs).toHaveLength(2)
    expect(logs[0].agent_type).toBe('agent_a')
    expect(logs[1].agent_type).toBe('agent_b')
  })

  it('times out if provider takes too long', async () => {
    const slowProvider: ILLMProvider = {
      async call() {
        return new Promise((resolve) => setTimeout(() => resolve({ content: 'late' }), 5000))
      },
    }

    const runner = new AgentRunner(slowProvider, { max_retries: 1, base_delay_ms: 1, timeout_ms: 50 })

    await expect(runner.run([{ role: 'user', content: 'hi' }])).rejects.toThrow('LLM call timed out')
  })
})
