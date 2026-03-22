import { z } from 'zod/v4'
import { TraitWeightSchema } from './trait.js'
import { ReflectionInjectionSchema, NPCInjectionSchema } from './injection.js'

// ============================================================
// Save File
// ============================================================

export const SaveFileSchema = z.object({
  save_id: z.string(),
  genesis_document_id: z.string(),
  saved_at_turn: z.number().int(),
  world_state_snapshot: z.record(z.string(), z.unknown()),
  all_character_states: z.record(z.string(), z.unknown()),
  trait_weights: z.array(TraitWeightSchema),
  conversation_histories: z.record(z.string(), z.unknown()),
  injection_queues_snapshot: z.object({
    reflection: z.array(ReflectionInjectionSchema),
    npc_queues: z.record(z.string(), z.array(NPCInjectionSchema)),
  }),
})

export type SaveFile = z.infer<typeof SaveFileSchema>
