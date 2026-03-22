import { describe, it, expect } from 'vitest'
import { MainPipeline, PipelineExecutionError } from './main-pipeline.js'
import { LoggingMiddleware } from './middleware.js'
import type { IPipelineStep, PipelineContext, StepResult } from './types.js'
import { createPipelineContext } from './types.js'

function makeStep<TIn, TOut>(
  name: string,
  fn: (input: TIn, ctx: PipelineContext) => StepResult<TOut>,
): IPipelineStep<TIn, TOut> {
  return {
    name,
    execute: async (input, ctx) => fn(input, ctx),
  }
}

describe('MainPipeline', () => {
  const ctx = createPipelineContext('session_1', 'player', 1)

  it('executes steps in sequence', async () => {
    const step1 = makeStep<string, number>('parse', (input) => ({
      status: 'continue',
      data: input.length,
    }))

    const step2 = makeStep<number, string>('transform', (input) => ({
      status: 'continue',
      data: `length=${input}`,
    }))

    const pipeline = new MainPipeline()
      .addStep(step1)
      .addStep(step2)

    const result = await pipeline.execute('hello', ctx)
    // Last step's data is returned as-is (cast to NarrativeOutput by pipeline)
    expect(result as unknown).toBe('length=5')
  })

  it('handles short circuit', async () => {
    const step1 = makeStep<string, never>('block', () => ({
      status: 'short_circuit',
      output: { text: '你不应该这么做', source: 'reflection' as const },
    }))

    const step2 = makeStep<never, string>('unreachable', () => {
      throw new Error('should not be called')
    })

    const pipeline = new MainPipeline().addStep(step1).addStep(step2)
    const result = await pipeline.execute('input', ctx)
    expect(result.text).toBe('你不应该这么做')
    expect(result.source).toBe('reflection')
  })

  it('throws on error result', async () => {
    const step = makeStep<string, never>('fail', () => ({
      status: 'error',
      error: { code: 'PARSE_FAILED', message: 'bad json', step: 'fail', recoverable: true },
    }))

    const pipeline = new MainPipeline().addStep(step)
    await expect(pipeline.execute('input', ctx)).rejects.toThrow(PipelineExecutionError)
  })

  it('records middleware logs', async () => {
    const logger = new LoggingMiddleware()
    const step = makeStep<string, string>('echo', (input) => ({
      status: 'continue',
      data: input,
    }))

    const pipeline = new MainPipeline().addStep(step).addMiddleware(logger)
    await pipeline.execute('test', ctx)

    const logs = logger.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].step).toBe('echo')
    expect(logs[0].status).toBe('continue')
    expect(logs[0].duration_ms).toBeGreaterThanOrEqual(0)
  })

  it('passes data between steps via inputMapper', async () => {
    const step1 = makeStep<string, { parsed: string }>('parse', (input) => ({
      status: 'continue',
      data: { parsed: input.toUpperCase() },
    }))

    const step2 = makeStep<string, string>('process', (input) => ({
      status: 'continue',
      data: `processed: ${input}`,
    }))

    const pipeline = new MainPipeline()
      .addStep(step1)
      .addStep(step2, (prev) => prev.parsed)

    const result = await pipeline.execute('hello', ctx)
    expect(result as unknown).toBe('processed: HELLO')
  })

  it('supports context data sharing between steps', async () => {
    const step1 = makeStep<string, string>('writer', (input, ctx) => {
      ctx.data.set('tone', 'aggressive')
      return { status: 'continue', data: input }
    })

    const step2 = makeStep<string, string>('reader', (input, ctx) => {
      const tone = ctx.data.get('tone')
      return { status: 'continue', data: `${input}:${tone}` }
    })

    const pipeline = new MainPipeline().addStep(step1).addStep(step2)
    const result = await pipeline.execute('test', ctx)
    expect(result as unknown).toBe('test:aggressive')
  })
})
