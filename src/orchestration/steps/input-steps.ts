import type { IPipelineStep, PipelineContext, StepResult } from '../pipeline/types.js'
import type { AgentRunner } from '../../ai/runner/agent-runner.js'
import type {
  ParsedIntent,
  AtomicAction,
  InputPipelineOutput,
  ToneSignals,
} from '../../domain/models/pipeline-io.js'
import { ParsedIntentSchema } from '../../domain/models/pipeline-io.js'
import { ResponseParser } from '../../ai/parser/response-parser.js'

// ============================================================
// Step 1: ValidationStep — basic input validation (pure code)
// ============================================================

const MAX_INPUT_LENGTH = 500

export class ValidationStep implements IPipelineStep<string, string> {
  readonly name = 'ValidationStep'

  async execute(input: string, _context: PipelineContext): Promise<StepResult<string>> {
    const trimmed = input.trim()

    if (trimmed.length === 0) {
      return {
        status: 'error',
        error: {
          code: 'EMPTY_INPUT',
          message: 'Player input must not be empty.',
          step: this.name,
          recoverable: true,
        },
      }
    }

    if (trimmed.length > MAX_INPUT_LENGTH) {
      return {
        status: 'error',
        error: {
          code: 'INPUT_TOO_LONG',
          message: `Player input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`,
          step: this.name,
          recoverable: true,
        },
      }
    }

    return { status: 'continue', data: trimmed }
  }
}

// ============================================================
// Step 2: InputParserStep — LLM parse of raw text into intent
// ============================================================

export class InputParserStep implements IPipelineStep<string, ParsedIntent> {
  readonly name = 'InputParserStep'
  private readonly agentRunner: AgentRunner
  private readonly parser = new ResponseParser(ParsedIntentSchema)

  constructor(agentRunner: AgentRunner) {
    this.agentRunner = agentRunner
  }

  async execute(input: string, context: PipelineContext): Promise<StepResult<ParsedIntent>> {
    const systemPrompt = [
      'You are the InputParser agent for a CRPG engine.',
      'Given the player\'s raw input and game context, extract the structured intent.',
      'Extract the player\'s intent as a single compound action. The action type is an UPPER_SNAKE_CASE verb describing the primary action (e.g. MOVE_TO, SPEAK_TO, EXAMINE, SEARCH, HIDE, ATTACK, PICK_UP, USE, OBSERVE, DODGE, FLEE — use whatever fits best). If the player describes multiple actions in one input, merge them into ONE action whose "method" field describes the full sequence.',
      'Respond with ONLY valid JSON matching the ParsedIntent schema:',
      '{ "intent": string, "tone_signals": Record<string,number>, "atomic_actions": [{ "type": string, "target": string|null, "method": string|null, "order": 0 }], "ambiguity_flags": string[] }',
      'IMPORTANT: Always output exactly ONE atomic action with order=0.',
    ].join('\n')

    const recentContext = context.data.get('recent_context') as {
      recent_narrative?: string[]
      known_facts?: string[]
    } | undefined

    const userMessage = JSON.stringify({
      raw_text: input,
      session_id: context.session_id,
      player_character_id: context.player_character_id,
      turn_number: context.turn_number,
      recent_narrative: recentContext?.recent_narrative?.slice(-5) ?? [],
      known_facts: recentContext?.known_facts?.slice(-10) ?? [],
    })

    try {
      const response = await this.agentRunner.run(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        { agent_type: 'InputParser' },
      )

      const result = this.parser.parse(response.content)

      if (!result.success) {
        return {
          status: 'error',
          error: {
            code: 'PARSE_FAILED',
            message: `InputParser response parse failed: ${result.error.message}`,
            step: this.name,
            recoverable: false,
          },
        }
      }

      context.data.set('tone_signals', result.data.tone_signals)
      context.data.set('parsed_intent', result.data)

      return { status: 'continue', data: result.data }
    } catch (err) {
      return {
        status: 'error',
        error: {
          code: 'LLM_CALL_FAILED',
          message: `InputParser LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
          step: this.name,
          recoverable: false,
        },
      }
    }
  }
}

// ============================================================
// Step 3: AmbiguityResolverStep — conditional LLM disambiguation
// ============================================================

export class AmbiguityResolverStep implements IPipelineStep<ParsedIntent, ParsedIntent> {
  readonly name = 'AmbiguityResolverStep'
  private readonly agentRunner: AgentRunner

  constructor(agentRunner: AgentRunner) {
    this.agentRunner = agentRunner
  }

  async execute(input: ParsedIntent, _context: PipelineContext): Promise<StepResult<ParsedIntent>> {
    if (input.ambiguity_flags.length === 0) {
      return { status: 'continue', data: input }
    }

    const systemPrompt = [
      'You are the AmbiguityResolver agent for a CRPG engine.',
      'Resolve ambiguous atomic actions by clarifying the method.',
      'For each ambiguity flag, return a resolved_method and confidence.',
      'Respond with ONLY valid JSON: { "resolutions": [{ "index": number, "resolved_method": string, "confidence": number }] }',
    ].join('\n')

    const userMessage = JSON.stringify({
      atomic_actions: input.atomic_actions,
      ambiguity_flags: input.ambiguity_flags,
      intent: input.intent,
    })

    try {
      const response = await this.agentRunner.run(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        { agent_type: 'AmbiguityResolver' },
      )

      // Best-effort: apply resolutions to actions
      let parsed: { resolutions?: Array<{ index: number; resolved_method: string }> }
      try {
        parsed = JSON.parse(response.content)
      } catch {
        // If we can't parse the resolution, proceed with original actions
        return { status: 'continue', data: { ...input, ambiguity_flags: [] } }
      }

      const updatedActions = [...input.atomic_actions]
      if (parsed.resolutions) {
        for (const res of parsed.resolutions) {
          if (res.index >= 0 && res.index < updatedActions.length) {
            updatedActions[res.index] = {
              ...updatedActions[res.index],
              method: res.resolved_method,
            }
          }
        }
      }

      return {
        status: 'continue',
        data: { ...input, atomic_actions: updatedActions, ambiguity_flags: [] },
      }
    } catch (err) {
      return {
        status: 'error',
        error: {
          code: 'LLM_CALL_FAILED',
          message: `AmbiguityResolver LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
          step: this.name,
          recoverable: false,
        },
      }
    }
  }
}

// ============================================================
// Step 4: ActionValidationStep — validate action types & sort
// ============================================================

export class ActionValidationStep implements IPipelineStep<ParsedIntent, ParsedIntent> {
  readonly name = 'ActionValidationStep'

  async execute(input: ParsedIntent, _context: PipelineContext): Promise<StepResult<ParsedIntent>> {
    if (input.atomic_actions.length === 0) {
      return {
        status: 'error',
        error: {
          code: 'NO_ACTIONS',
          message: 'ParsedIntent contains no atomic actions.',
          step: this.name,
          recoverable: false,
        },
      }
    }

    const sortedActions: AtomicAction[] = [...input.atomic_actions].sort(
      (a, b) => a.order - b.order,
    )

    return {
      status: 'continue',
      data: { ...input, atomic_actions: sortedActions },
    }
  }
}

// ============================================================
// Step 5: ToneSignalStep — write tone_signals to context
// ============================================================

export class ToneSignalStep implements IPipelineStep<ParsedIntent, InputPipelineOutput> {
  readonly name = 'ToneSignalStep'

  async execute(
    input: ParsedIntent,
    context: PipelineContext,
  ): Promise<StepResult<InputPipelineOutput>> {
    const toneSignals: ToneSignals = input.tone_signals
    context.data.set('tone_signals', toneSignals)

    const output: InputPipelineOutput = {
      original_text: (context.data.get('original_text') as string) ?? '',
      intent: input.intent,
      tone_signals: toneSignals,
      atomic_actions: input.atomic_actions,
      ambiguity_resolved: input.ambiguity_flags.length === 0,
    }

    context.data.set('input_pipeline_output', output)

    return { status: 'continue', data: output }
  }
}
