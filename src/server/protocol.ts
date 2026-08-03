import { z } from 'zod/v4'
import { PlayerAttributesSchema } from '../domain/models/attributes.js'
import { PlayerProfileInputSchema } from '../domain/models/player-profile.js'
import { StoryDriverSchema, StoryPressureSchema } from '../domain/models/story.js'
import {
  WorldCreationDraftSchema,
  type ResolvedWorldBrief,
  type WorldBuilderConfig,
} from '../domain/models/world-creation.js'

// ============================================================
// Client → Server messages
// ============================================================

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('initialize') }),
  z.object({ type: z.literal('new_game') }),
  z.object({ type: z.literal('input'), text: z.string().min(1) }),
  z.object({ type: z.literal('save') }),
  z.object({ type: z.literal('ping') }),
  z.object({ type: z.literal('reroll_attributes') }),
  z.object({
    type: z.literal('confirm_attributes'),
    attributes: PlayerAttributesSchema,
    profile: PlayerProfileInputSchema,
  }),
  z.object({ type: z.literal('reset') }),
  z.object({ type: z.literal('insist') }),
  z.object({ type: z.literal('abandon') }),
  z.object({ type: z.literal('retry') }),
  z.object({
    type: z.literal('select_world'),
    draft: WorldCreationDraftSchema,
  }),
  z.object({
    type: z.literal('select_style'),
    preset_index: z.number().int().min(-1),
    story_drivers: z.array(StoryDriverSchema).min(1).optional(),
    story_pressure: StoryPressureSchema.optional(),
  }),
  z.object({
    type: z.literal('select_style_custom'),
    tone: z.string().min(1),
    narrative_style: z.string().min(1),
    story_drivers: z.array(StoryDriverSchema).min(1),
    story_pressure: StoryPressureSchema,
  }),
  // Character info
  z.object({ type: z.literal('get_characters') }),
  // Session management
  z.object({ type: z.literal('list_sessions') }),
  z.object({ type: z.literal('new_session') }),
  z.object({ type: z.literal('switch_session'), session_id: z.string() }),
  z.object({ type: z.literal('delete_session'), session_id: z.string() }),
  // LLM config
  z.object({ type: z.literal('get_llm_config') }),
  z.object({
    type: z.literal('set_llm_config'),
    provider: z.enum(['openai_compatible', 'gemini', 'openai', 'anthropic', 'xai', 'deepseek']),
    api_key: z.string().min(1),
    model: z.string(),
    base_url: z.string().optional(),
  }),
  z.object({
    type: z.literal('test_llm_config'),
    provider: z.enum(['openai_compatible', 'gemini', 'openai', 'anthropic', 'xai', 'deepseek']),
    api_key: z.string().min(1),
    model: z.string(),
    base_url: z.string().optional(),
  }),
  z.object({
    type: z.literal('list_models'),
    provider: z.enum(['openai_compatible', 'gemini', 'openai', 'anthropic', 'xai', 'deepseek']),
    api_key: z.string().min(1),
    base_url: z.string().optional(),
  }),
])

export type ClientMessage = z.infer<typeof ClientMessageSchema>

// ============================================================
// Server → Client messages
// ============================================================

export type ServerMessage =
  | { type: 'narrative'; text: string; source: string }
  | { type: 'voices'; voices: Array<{ trait_id: string; line: string }> }
  | { type: 'check'; attribute: string; difficulty: string; base_target: number; modifiers: Array<{ label: string; value: number }>; target: number; roll: number; attribute_value: number; total: number; passed: boolean }
  | { type: 'status'; location: string; turn: number }
  | { type: 'error'; message: string; retryable?: boolean }
  | { type: 'init_progress'; step: string }
  | { type: 'init_complete'; doc: unknown }
  | { type: 'char_create'; attributes: Record<string, number>; attribute_meta: Array<{ id: string; display_name: string; domain: string }>; world_brief: CharacterWorldBriefForClient }
  | { type: 'save_result'; saveId: string }
  | { type: 'save_error'; message: string }
  | { type: 'pong' }
  | { type: 'debug_turn_start'; turn: number; input: string }
  | { type: 'debug_step'; step: string; phase: 'start' | 'end'; status?: string; duration_ms?: number; data?: string }
  | { type: 'debug_state'; states: Record<string, unknown> }
  | { type: 'reset_complete' }
  | { type: 'history'; messages: ServerMessage[] }
  | { type: 'insistence_prompt' }
  | { type: 'style_select'; presets: StylePresetForClient[] }
  | { type: 'world_builder_config'; config: WorldBuilderConfig }
  | { type: 'session_list'; sessions: Array<{ id: string; label: string; turn: number; location: string; updated_at: number }> }
  | { type: 'characters'; player: CharacterInfo; npcs: CharacterInfo[] }
  | { type: 'llm_config'; config: { provider: string; api_key: string; model: string; base_url?: string } }
  | { type: 'llm_config_saved' }
  | { type: 'llm_test_result'; success: boolean; message: string }
  | { type: 'model_list'; models: string[] }
  | { type: 'no_game' }

export interface CharacterInfo {
  id: string
  name: string
  background?: string
  gender?: 'MALE' | 'FEMALE'
  age?: string
  role?: string
  attributes?: Record<string, number>
  // NPC knowledge fields
  first_impression?: string
  known_facts?: string[]
  relationship_to_player?: string
  last_seen_location?: string
  last_seen_emotion?: string
  last_interaction_turn?: number
}

export interface StylePresetForClient {
  id: string
  label: string
  description: string
  story_drivers: string[]
  story_pressure: string
}

export interface WorldBriefForClient {
  tone: string
  story_drivers: string[]
  story_pressure: string
}

export type CharacterWorldBriefForClient = ResolvedWorldBrief | WorldBriefForClient
