import { z } from 'zod/v4'
import { EventWeight, EventTag, GameTimestampSchema } from './common.js'

// ============================================================
// Event Tier 1: Metadata (always loaded, in-memory index)
// ============================================================

export const EventTier1Schema = z.object({
  id: z.string(),
  title: z.string(),
  timestamp: GameTimestampSchema,
  location_id: z.string(),
  participant_ids: z.array(z.string()),
  tags: z.array(EventTag),
  weight: EventWeight,
  force_level: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  created_at: z.number(),
})

export type EventTier1 = z.infer<typeof EventTier1Schema>

// ============================================================
// Event Tier 2: Summary (lazy loaded)
// ============================================================

export const EventTier2Schema = z.object({
  summary: z.string(),
  choice_signals: z.record(z.string(), z.number()),
})

export type EventTier2 = z.infer<typeof EventTier2Schema>

// ============================================================
// Event Tier 3: Context (lazy loaded)
// ============================================================

export const EventTier3Schema = z.object({
  context: z.string(),
  related_event_ids: z.array(z.string()),
  state_snapshot: z.object({
    location_state: z.string(),
    participant_states: z.record(z.string(), z.string()),
  }),
})

export type EventTier3 = z.infer<typeof EventTier3Schema>

// ============================================================
// Event Tier 4: Narrative text (lazy loaded, immutable)
// ============================================================

export const EventTier4Schema = z.object({
  narrative_text: z.string(),
})

export type EventTier4 = z.infer<typeof EventTier4Schema>

// ============================================================
// Full Event (all tiers combined)
// ============================================================

export const EventSchema = EventTier1Schema
  .merge(EventTier2Schema)
  .merge(EventTier3Schema)
  .merge(EventTier4Schema)

export type Event = z.infer<typeof EventSchema>
