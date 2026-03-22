import { z } from 'zod/v4'

// ============================================================
// Client → Server messages
// ============================================================

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('initialize') }),
  z.object({ type: z.literal('input'), text: z.string().min(1) }),
  z.object({ type: z.literal('save') }),
  z.object({ type: z.literal('ping') }),
])

export type ClientMessage = z.infer<typeof ClientMessageSchema>

// ============================================================
// Server → Client messages
// ============================================================

export type ServerMessage =
  | { type: 'narrative'; text: string; source: string }
  | { type: 'voices'; voices: Array<{ trait_id: string; line: string }> }
  | { type: 'status'; location: string; turn: number }
  | { type: 'error'; message: string }
  | { type: 'init_progress'; step: string }
  | { type: 'init_complete'; doc: unknown }
  | { type: 'save_result'; saveId: string }
  | { type: 'save_error'; message: string }
  | { type: 'pong' }
