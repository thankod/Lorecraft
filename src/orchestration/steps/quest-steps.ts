import type { IPipelineStep, PipelineContext, StepResult } from '../pipeline/types.js'
import type { AgentRunner } from '../../ai/runner/agent-runner.js'
import type { IStateStore } from '../../infrastructure/storage/interfaces.js'
import type { EventPipelineData } from './event-steps.js'
import type { QuestGraph, QuestDelta } from '../../domain/models/quest.js'
import { QuestDeltaSchema } from '../../domain/models/quest.js'
import { ResponseParser } from '../../ai/parser/response-parser.js'
import { parseWithRepair } from '../../ai/parser/json-repair.js'
import { prompts } from '../../ai/prompt/prompts.js'

// ============================================================
// QuestTrackingStep — LLM-driven quest graph maintenance
// Inserted after StateWritebackStep, before NarrativeProgressStep
// Non-critical: failures are silently skipped
// ============================================================

export class QuestTrackingStep implements IPipelineStep<EventPipelineData, EventPipelineData> {
  readonly name = 'QuestTrackingStep'
  private readonly agentRunner: AgentRunner
  private readonly stateStore: IStateStore
  private readonly parser = new ResponseParser(QuestDeltaSchema)

  constructor(agentRunner: AgentRunner, stateStore: IStateStore) {
    this.agentRunner = agentRunner
    this.stateStore = stateStore
  }

  async execute(
    input: EventPipelineData,
    context: PipelineContext,
  ): Promise<StepResult<EventPipelineData>> {
    try {
      // 1. Load current quest graph
      const graph = await this.stateStore.get<QuestGraph>('quests:graph') ?? {
        quests: [],
        nodes: [],
        edges: [],
      }

      // 2. Build LLM prompt with event + existing graph
      const gen = input.generator_output
      const systemPrompt = prompts.get('quest_tracker')

      const userMessage = JSON.stringify({
        event: {
          title: gen.title,
          summary: gen.summary,
          tags: gen.tags,
          narrative_text: gen.narrative_text,
          state_changes: gen.state_changes,
        },
        current_quest_graph: {
          quests: graph.quests,
          nodes: graph.nodes,
          edges: graph.edges,
        },
        turn: context.turn_number,
      })

      const response = await this.agentRunner.run(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        { agent_type: 'QuestTracker' },
      )

      // 3. Parse delta
      const result = await parseWithRepair(
        this.parser,
        this.agentRunner,
        response.content,
        '{ "new_quests": [], "new_nodes": [], "new_edges": [], "completed_nodes": [], "failed_nodes": [], "completed_quests": [], "failed_quests": [] }',
      )

      if (!result.success) {
        // Non-critical — skip
        return { status: 'continue', data: input }
      }

      const delta = result.data

      // 4. Apply delta to graph
      const updated = applyDelta(graph, delta, context.turn_number)

      // 5. Write back
      await this.stateStore.set('quests:graph', updated)
      context.data.set('quest_graph', updated)
    } catch {
      // Non-critical — silently skip on any failure
    }

    return { status: 'continue', data: input }
  }
}

function applyDelta(graph: QuestGraph, delta: QuestDelta, turn: number): QuestGraph {
  const quests = [...graph.quests]
  const nodes = [...graph.nodes]
  const edges = [...graph.edges]

  // Add new quests
  for (const q of delta.new_quests) {
    if (!quests.some((existing) => existing.id === q.id)) {
      quests.push({ id: q.id, title: q.title, status: 'active', created_at_turn: turn })
    }
  }

  // Add new nodes
  for (const n of delta.new_nodes) {
    if (!nodes.some((existing) => existing.id === n.id)) {
      nodes.push({
        id: n.id,
        quest_id: n.quest_id,
        summary: n.summary,
        hint: n.hint,
        status: 'active',
        turn,
      })
    }
  }

  // Add new edges
  for (const e of delta.new_edges) {
    if (!edges.some((existing) => existing.from_node_id === e.from_node_id && existing.to_node_id === e.to_node_id)) {
      edges.push({ from_node_id: e.from_node_id, to_node_id: e.to_node_id })
    }
  }

  // Mark completed nodes
  for (const nodeId of delta.completed_nodes) {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) node.status = 'completed'
  }

  // Mark failed nodes
  for (const nodeId of delta.failed_nodes) {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) node.status = 'failed'
  }

  // Mark completed quests
  for (const questId of delta.completed_quests) {
    const quest = quests.find((q) => q.id === questId)
    if (quest) quest.status = 'completed'
  }

  // Mark failed quests
  for (const questId of delta.failed_quests) {
    const quest = quests.find((q) => q.id === questId)
    if (quest) quest.status = 'failed'
  }

  return { quests, nodes, edges }
}
