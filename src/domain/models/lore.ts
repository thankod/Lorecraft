import { z } from 'zod/v4'
import { LoreAuthorityLevel, LoreFactType, GameTimestampSchema } from './common.js'

// ============================================================
// Lore Causal Entry
// ============================================================

export const LoreCausalEntrySchema = z.object({
  before_content: z.string(),
  change_reason: z.string(),
  after_content: z.string(),
  caused_by_event_id: z.string(),
  timestamp: GameTimestampSchema,
})

export type LoreCausalEntry = z.infer<typeof LoreCausalEntrySchema>

// ============================================================
// Lore Entry
// ============================================================

export const LoreEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  fact_type: LoreFactType,
  authority_level: LoreAuthorityLevel,
  subject_ids: z.array(z.string()),
  source_event_id: z.string().nullable(),
  created_at_turn: z.number().int(),
  causal_chain: z.array(LoreCausalEntrySchema),
  related_lore_ids: z.array(z.string()),
  content_hash: z.string(),
})

export type LoreEntry = z.infer<typeof LoreEntrySchema>

// ============================================================
// NPC Profile (Lore local cache)
// ============================================================

export const NPCProfileSchema = z.object({
  npc_id: z.string(),
  personal_facts: z.array(z.string()),
  known_relationships: z.array(z.string()),
  last_synced_turn: z.number().int(),
})

export type NPCProfile = z.infer<typeof NPCProfileSchema>
