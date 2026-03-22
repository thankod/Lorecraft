import type { IPipelineMiddleware, PipelineContext, StepResult } from './types.js'

/**
 * Logs each step's input summary, output status, and duration.
 */
export class LoggingMiddleware implements IPipelineMiddleware {
  private logs: StepLog[] = []

  before(step_name: string, _input: unknown, _context: PipelineContext): void {
    // Logged in after() with timing
  }

  after(step_name: string, result: StepResult<unknown>, _context: PipelineContext, duration_ms: number): void {
    this.logs.push({
      step: step_name,
      status: result.status,
      duration_ms: Math.round(duration_ms * 100) / 100,
      timestamp: Date.now(),
    })
  }

  getLogs(): StepLog[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }
}

export interface StepLog {
  step: string
  status: 'continue' | 'short_circuit' | 'error'
  duration_ms: number
  timestamp: number
}

/**
 * Serializes each step's input/output as JSON for debugging.
 */
export class DebugMiddleware implements IPipelineMiddleware {
  private entries: DebugEntry[] = []

  before(step_name: string, input: unknown, _context: PipelineContext): void {
    this.entries.push({
      step: step_name,
      phase: 'input',
      data: safeSerialize(input),
      timestamp: Date.now(),
    })
  }

  after(step_name: string, result: StepResult<unknown>, _context: PipelineContext, _duration_ms: number): void {
    this.entries.push({
      step: step_name,
      phase: 'output',
      data: safeSerialize(result),
      timestamp: Date.now(),
    })
  }

  getEntries(): DebugEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries = []
  }
}

export interface DebugEntry {
  step: string
  phase: 'input' | 'output'
  data: string
  timestamp: number
}

function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
