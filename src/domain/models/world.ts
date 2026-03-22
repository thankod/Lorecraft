import { z } from 'zod/v4'
import {
  Accessibility,
  TraversalCondition,
  FactionStrength,
  FactionRelationType,
  GameTimestampSchema,
} from './common.js'

// ============================================================
// Location
// ============================================================

export const LocationCausalEntrySchema = z.object({
  before_status: z.string(),
  change_reason: z.string(),
  after_status: z.string(),
  caused_by_event_id: z.string(),
  timestamp: GameTimestampSchema,
})

export type LocationCausalEntry = z.infer<typeof LocationCausalEntrySchema>

export const LocationStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  region_id: z.string(),
  current_status: z.string(),
  accessibility: Accessibility,
  current_occupant_ids: z.array(z.string()),
  is_frozen: z.boolean(),
  last_observed_turn: z.number().int(),
  causal_chain: z.array(LocationCausalEntrySchema),
})

export type LocationState = z.infer<typeof LocationStateSchema>

// ============================================================
// Location Graph (connectivity)
// ============================================================

export const LocationEdgeSchema = z.object({
  from_location_id: z.string(),
  to_location_id: z.string(),
  traversal_condition: TraversalCondition,
  condition_detail: z.string().nullable(),
  travel_time_turns: z.number().int().nonnegative(),
})

export type LocationEdge = z.infer<typeof LocationEdgeSchema>

// ============================================================
// NPC Rough Location
// ============================================================

export const NPCRoughLocationSchema = z.object({
  npc_id: z.string(),
  location_id: z.string(),
  last_updated_turn: z.number().int(),
})

export type NPCRoughLocation = z.infer<typeof NPCRoughLocationSchema>

// ============================================================
// Faction
// ============================================================

export const FactionCausalEntrySchema = z.object({
  change_description: z.string(),
  caused_by_event_id: z.string(),
  timestamp: GameTimestampSchema,
})

export type FactionCausalEntry = z.infer<typeof FactionCausalEntrySchema>

export const FactionStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  current_strength: FactionStrength,
  current_status_description: z.string(),
  resources_description: z.string(),
  causal_chain: z.array(FactionCausalEntrySchema),
})

export type FactionState = z.infer<typeof FactionStateSchema>

export const FactionRelationshipSchema = z.object({
  faction_a_id: z.string(),
  faction_b_id: z.string(),
  relation_type: FactionRelationType,
  semantic_description: z.string(),
  causal_chain: z.array(FactionCausalEntrySchema),
})

export type FactionRelationship = z.infer<typeof FactionRelationshipSchema>
