import { z } from 'zod/v4'
import { TraitType, TraitStatus } from './common.js'

// ============================================================
// Trait Weight (runtime state)
// ============================================================

export const TraitWeightSchema = z.object({
  trait_id: z.string(),
  trait_type: TraitType,
  current_weight: z.number().nonnegative(),
  last_updated_turn: z.number().int(),
})

export type TraitWeight = z.infer<typeof TraitWeightSchema>

// Note: `status` is computed at runtime by getTraitStatus(), not persisted.

// ============================================================
// Trait Config (static configuration)
// ============================================================

export const TraitConfigSchema = z.object({
  trait_id: z.string(),
  trait_type: TraitType,
  display_name: z.string(),
  voice_description: z.string(),
  threshold_active: z.number(),
  threshold_silent: z.number(),
  hysteresis_band: z.number().nonnegative(),
  decay_rate: z.number().min(0).max(1),
  signal_mapping: z.record(z.string(), z.number()),
})

export type TraitConfig = z.infer<typeof TraitConfigSchema>

// ============================================================
// Weight Update Log (debug only)
// ============================================================

export const WeightUpdateLogSchema = z.object({
  trait_id: z.string(),
  delta: z.number(),
  signal_type: z.enum(['A', 'B', 'DECAY']),
  source_event_id: z.string().nullable(),
  before_weight: z.number(),
  after_weight: z.number(),
  turn: z.number().int(),
})

export type WeightUpdateLog = z.infer<typeof WeightUpdateLogSchema>
