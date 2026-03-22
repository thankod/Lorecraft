import { z } from 'zod/v4'

// ============================================================
// Reflection Injection (Narrative Rail → Reflection System)
// ============================================================

export const ReflectionInjectionSchema = z.object({
  id: z.string(),
  voice_id: z.string(),
  content: z.string(),
  priority: z.enum(['LOW', 'HIGH']),
  expiry_turns: z.number().int().positive(),
  created_at_turn: z.number().int(),
})

export type ReflectionInjection = z.infer<typeof ReflectionInjectionSchema>

// ============================================================
// NPC Injection (Narrative Rail → NPC Agent)
// ============================================================

export const NPCInjectionSchema = z.object({
  id: z.string(),
  npc_id: z.string(),
  context: z.string(),
  condition: z.string(),
  expiry_turns: z.number().int().positive(),
  created_at_turn: z.number().int(),
})

export type NPCInjection = z.infer<typeof NPCInjectionSchema>
