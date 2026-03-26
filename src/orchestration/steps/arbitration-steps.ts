import { z } from 'zod/v4'
import type { IPipelineStep, PipelineContext, StepResult, NarrativeOutput } from '../pipeline/types.js'
import type { AgentRunner } from '../../ai/runner/agent-runner.js'
import type { IStateStore, ILoreStore, IEventStore } from '../../infrastructure/storage/interfaces.js'
import type {
  AtomicAction,
  ArbitrationResult,
  ArbitrationReport,
} from '../../domain/models/pipeline-io.js'
import type { PlayerAttributes } from '../../domain/models/attributes.js'
import { ATTRIBUTE_IDS, ATTRIBUTE_META } from '../../domain/models/attributes.js'
import { ArbitrationReportSchema } from '../../domain/models/pipeline-io.js'
import { ResponseParser } from '../../ai/parser/response-parser.js'
import { prompts } from '../../ai/prompt/prompts.js'

// ============================================================
// Step 0: ParallelQueryStep — fetch memory + world state + lore
// ============================================================

export class ParallelQueryStep implements IPipelineStep<AtomicAction, AtomicAction> {
  readonly name = 'ParallelQueryStep'
  private readonly stateStore: IStateStore
  private readonly loreStore: ILoreStore
  private readonly eventStore: IEventStore

  constructor(stateStore: IStateStore, loreStore: ILoreStore, eventStore: IEventStore) {
    this.stateStore = stateStore
    this.loreStore = loreStore
    this.eventStore = eventStore
  }

  async execute(input: AtomicAction, context: PipelineContext): Promise<StepResult<AtomicAction>> {
    const characterId = context.player_character_id

    const [subjectiveMemory, objectiveState, loreEntries, recentEvents] = await Promise.all([
      this.stateStore.get<unknown>(`memory:subjective:${characterId}`),
      this.stateStore.get<unknown>(`world:objective:${characterId}`),
      input.target ? this.loreStore.findBySubject(input.target) : Promise.resolve([]),
      this.eventStore.getAllTier1(),
    ])

    context.data.set('subjective_memory', subjectiveMemory)
    context.data.set('objective_state', objectiveState)
    context.data.set('lore_entries', loreEntries)
    context.data.set('recent_events', recentEvents.slice(-10).map((e) => e.title))

    return { status: 'continue', data: input }
  }
}

// ============================================================
// FeasibilityCheckStep — single LLM call for all checks
// ============================================================

export class FeasibilityCheckStep implements IPipelineStep<AtomicAction, AtomicAction> {
  readonly name = 'FeasibilityCheckStep'
  private readonly agentRunner: AgentRunner
  private readonly parser = new ResponseParser(ArbitrationReportSchema)

  constructor(agentRunner: AgentRunner) {
    this.agentRunner = agentRunner
  }

  async execute(input: AtomicAction, context: PipelineContext): Promise<StepResult<AtomicAction>> {
    const subjectiveMemory = context.data.get('subjective_memory')
    const objectiveState = context.data.get('objective_state')
    const loreEntries = context.data.get('lore_entries')
    const recentEvents = context.data.get('recent_events')

    const systemPrompt = prompts.get('feasibility_judge')

    const userMessage = JSON.stringify({
      action: input,
      subjective_memory: subjectiveMemory,
      objective_world_state: objectiveState,
      lore_context: loreEntries,
      recent_events: recentEvents,
    })

    try {
      const response = await this.agentRunner.run(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        { agent_type: 'FeasibilityJudge' },
      )

      const result = this.parser.parse(response.content)

      if (!result.success) {
        return {
          status: 'error',
          error: {
            code: 'PARSE_FAILED',
            message: `FeasibilityJudge response parse failed: ${result.error.message}`,
            step: this.name,
            recoverable: false,
          },
        }
      }

      const report = result.data
      context.data.set('arbitration_report', report)
      context.data.set('drift_flag', report.drift_flag)

      if (!report.passed && report.rejection_narrative) {
        return {
          status: 'short_circuit',
          output: {
            text: report.rejection_narrative,
            source: 'rejection',
          } satisfies NarrativeOutput,
        }
      }

      return { status: 'continue', data: input }
    } catch (err) {
      return {
        status: 'error',
        error: {
          code: 'LLM_CALL_FAILED',
          message: `FeasibilityJudge LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
          step: this.name,
          recoverable: false,
        },
      }
    }
  }
}

// ============================================================
// AttributeCheckStep — d100 + attribute vs target (DM decides)
// ============================================================

export interface CheckModifier {
  label: string    // e.g. "目标处于愤怒状态"
  value: number    // positive = harder, negative = easier
}

export interface AttributeCheckResult {
  needed: boolean
  attribute_id?: string
  attribute_display_name?: string
  difficulty?: string
  base_target?: number
  modifiers?: CheckModifier[]
  target?: number
  roll?: number
  attribute_value?: number
  total?: number
  passed?: boolean
}

const DIFFICULTY_RANGES: Record<string, [number, number]> = {
  TRIVIAL:    [40, 60],
  ROUTINE:    [70, 90],
  HARD:       [100, 120],
  VERY_HARD:  [130, 150],
  LEGENDARY:  [160, 180],
}

const DIFFICULTY_IDS = Object.keys(DIFFICULTY_RANGES) as Array<keyof typeof DIFFICULTY_RANGES>

function rollTarget(difficulty: string): number {
  const range = DIFFICULTY_RANGES[difficulty]
  if (!range) return 80 // fallback to ROUTINE midpoint
  const [min, max] = range
  return min + Math.floor(Math.random() * (max - min + 1))
}

const CheckModifierSchema = z.object({
  label: z.string(),
  value: z.number().int(),
})

const CheckDecisionSchema = z.object({
  needs_check: z.boolean(),
  attribute: z.string().nullable(),
  difficulty: z.string().nullable(),
  modifiers: z.array(CheckModifierSchema).nullable(),
  reason: z.string().nullable(),
})

export class AttributeCheckStep implements IPipelineStep<AtomicAction, AtomicAction> {
  readonly name = 'AttributeCheckStep'
  private readonly agentRunner: AgentRunner
  private readonly parser = new ResponseParser(CheckDecisionSchema)

  constructor(agentRunner: AgentRunner) {
    this.agentRunner = agentRunner
  }

  async execute(input: AtomicAction, context: PipelineContext): Promise<StepResult<AtomicAction>> {
    const attrs = context.data.get('player_attributes') as PlayerAttributes | undefined
    if (!attrs) {
      context.data.set('attribute_check', { needed: false } satisfies AttributeCheckResult)
      return { status: 'continue', data: input }
    }

    const subjectiveMemory = context.data.get('subjective_memory')
    const objectiveState = context.data.get('objective_state')

    const attrList = ATTRIBUTE_IDS.map((id) => `${ATTRIBUTE_META[id].display_name}(${id}): ${attrs[id]} — ${ATTRIBUTE_META[id].domain}`).join('\n')

    const systemPrompt = prompts.fill('check_dm', {
      attribute_list: `Player attributes:\n${attrList}`,
    })

    const userMessage = JSON.stringify({
      action: input,
      subjective_memory: subjectiveMemory,
      objective_world_state: objectiveState,
    })

    try {
      const response = await this.agentRunner.run(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        { agent_type: 'CheckDM' },
      )

      const result = this.parser.parse(response.content)

      if (!result.success || !result.data.needs_check || !result.data.attribute || !result.data.difficulty) {
        context.data.set('attribute_check', { needed: false } satisfies AttributeCheckResult)
        return { status: 'continue', data: input }
      }

      const decision = result.data
      const difficulty = DIFFICULTY_IDS.includes(decision.difficulty as any) ? decision.difficulty! : 'ROUTINE'
      const baseTarget = rollTarget(difficulty)
      const modifiers: CheckModifier[] = (decision.modifiers ?? []).map((m) => ({
        label: m.label,
        value: Math.max(-30, Math.min(30, m.value)),  // clamp to [-30, 30]
      }))
      const modifierSum = modifiers.reduce((sum, m) => sum + m.value, 0)
      const target = Math.max(10, baseTarget + modifierSum)  // floor at 10

      const attrId = decision.attribute as keyof PlayerAttributes
      const meta = ATTRIBUTE_META[attrId as typeof ATTRIBUTE_IDS[number]]
      if (!meta) {
        context.data.set('attribute_check', { needed: false } satisfies AttributeCheckResult)
        return { status: 'continue', data: input }
      }

      // Roll d100
      const roll = Math.floor(Math.random() * 100) + 1
      const attrValue = attrs[attrId] ?? 0
      const total = roll + attrValue
      const passed = total >= target

      const checkResult: AttributeCheckResult = {
        needed: true,
        attribute_id: attrId,
        attribute_display_name: meta.display_name,
        difficulty,
        base_target: baseTarget,
        modifiers,
        target,
        roll,
        attribute_value: attrValue,
        total,
        passed,
      }

      context.data.set('attribute_check', checkResult)
      // Store pass/fail for EventGenerator to use
      context.data.set('check_passed', passed)
      context.data.set('check_description', `${meta.display_name}检定[${difficulty}]: d100(${roll}) + ${meta.display_name}(${attrValue}) = ${total} vs 目标${target} → ${passed ? '成功' : '失败'}`)

      return { status: 'continue', data: input }
    } catch (err) {
      // On error, skip the check
      context.data.set('attribute_check', { needed: false } satisfies AttributeCheckResult)
      return { status: 'continue', data: input }
    }
  }
}

// ============================================================
// ArbitrationResultStep — assemble final result
// ============================================================

export class ArbitrationResultStep implements IPipelineStep<AtomicAction, ArbitrationResult> {
  readonly name = 'ArbitrationResultStep'

  async execute(
    input: AtomicAction,
    context: PipelineContext,
  ): Promise<StepResult<ArbitrationResult>> {
    const forceFlag = (context.data.get('force_flag') as boolean | undefined) ?? false
    const forceLevel = (context.data.get('force_level') as 0 | 1 | 2 | undefined) ?? 0
    const driftFlag = (context.data.get('drift_flag') as boolean | undefined) ?? false

    const result: ArbitrationResult = {
      passed: true,
      action: input,
      force_flag: forceFlag,
      force_level: forceLevel,
      drift_flag: driftFlag,
      rejection_text: null,
    }

    context.data.set('arbitration_result', result)

    return { status: 'continue', data: result }
  }
}
