import type {
  IPipelineStep,
  IPipelineMiddleware,
  PipelineContext,
  StepResult,
  NarrativeOutput,
} from './types.js'

type AnyStep = IPipelineStep<any, any>

interface PipelineStepEntry {
  step: AnyStep
  inputMapper?: (prevOutput: any, context: PipelineContext) => any
}

/**
 * MainPipeline: orchestrates sequential step execution with
 * short-circuit support and error bubbling.
 */
export class MainPipeline {
  private steps: PipelineStepEntry[] = []
  private middlewares: IPipelineMiddleware[] = []

  addStep<TInput, TOutput>(
    step: IPipelineStep<TInput, TOutput>,
    inputMapper?: (prevOutput: any, context: PipelineContext) => TInput,
  ): this {
    this.steps.push({ step, inputMapper })
    return this
  }

  addMiddleware(middleware: IPipelineMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }

  async execute(initialInput: unknown, context: PipelineContext): Promise<NarrativeOutput> {
    let currentData: unknown = initialInput

    for (const { step, inputMapper } of this.steps) {
      const input = inputMapper ? inputMapper(currentData, context) : currentData

      // Before middleware
      for (const mw of this.middlewares) {
        mw.before?.(step.name, input, context)
      }

      const start = performance.now()
      const result: StepResult<unknown> = await step.execute(input, context)
      const duration = performance.now() - start

      // After middleware
      for (const mw of this.middlewares) {
        mw.after?.(step.name, result, context, duration)
      }

      switch (result.status) {
        case 'continue':
          currentData = result.data
          break

        case 'short_circuit':
          return result.output

        case 'error':
          throw new PipelineExecutionError(result.error.code, result.error.message, result.error.step)
      }
    }

    // The last step's output should be a NarrativeOutput
    return currentData as NarrativeOutput
  }
}

export class PipelineExecutionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly step: string,
  ) {
    super(`[${step}] ${code}: ${message}`)
    this.name = 'PipelineExecutionError'
  }
}
