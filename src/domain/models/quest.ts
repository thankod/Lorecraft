import { z } from 'zod/v4'

// ============================================================
// Quest Graph — dynamic task tracking system
// ============================================================

export const QuestStatusSchema = z.enum(['active', 'completed', 'failed'])
export type QuestStatus = z.infer<typeof QuestStatusSchema>

export const QuestNodeStatusSchema = z.enum(['completed', 'active', 'failed'])
export type QuestNodeStatus = z.infer<typeof QuestNodeStatusSchema>

export const QuestSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: QuestStatusSchema,
  created_at_turn: z.number().int().nonnegative(),
})
export type Quest = z.infer<typeof QuestSchema>

export const QuestNodeSchema = z.object({
  id: z.string(),
  quest_id: z.string(),
  summary: z.string(),
  hint: z.string(),
  status: QuestNodeStatusSchema,
  turn: z.number().int().nonnegative(),
})
export type QuestNode = z.infer<typeof QuestNodeSchema>

export const QuestEdgeSchema = z.object({
  from_node_id: z.string(),
  to_node_id: z.string(),
})
export type QuestEdge = z.infer<typeof QuestEdgeSchema>

export const QuestGraphSchema = z.object({
  quests: z.array(QuestSchema),
  nodes: z.array(QuestNodeSchema),
  edges: z.array(QuestEdgeSchema),
})
export type QuestGraph = z.infer<typeof QuestGraphSchema>

// ============================================================
// Quest Delta — incremental update from LLM
// ============================================================

export const QuestDeltaSchema = z.object({
  new_quests: z.array(z.object({
    id: z.string(),
    title: z.string(),
  })).default([]),
  new_nodes: z.array(z.object({
    id: z.string(),
    quest_id: z.string(),
    summary: z.string(),
    hint: z.string(),
  })).default([]),
  new_edges: z.array(z.object({
    from_node_id: z.string(),
    to_node_id: z.string(),
  })).default([]),
  completed_nodes: z.array(z.string()).default([]),
  failed_nodes: z.array(z.string()).default([]),
  completed_quests: z.array(z.string()).default([]),
  failed_quests: z.array(z.string()).default([]),
})
export type QuestDelta = z.infer<typeof QuestDeltaSchema>
