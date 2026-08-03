export interface ChoiceForClient {
  text: string
  check?: {
    attribute_id: string
    attribute_display_name: string
    difficulty: string
    pass_chance: number
  }
}

export interface GameplayOptions {
  inner_voice: boolean
  insistence: boolean
  action_arbiter: boolean
  narrative_progress: boolean
  world_assertion: boolean
}

export interface PlayerProfileInput {
  gender: 'MALE' | 'FEMALE'
  name?: string
  age?: string
  role?: string
  background_seed?: string
}

export interface LegacyWorldBriefForClient {
  tone: string
  story_drivers: string[]
  story_pressure: string
}

export type WorldBriefForClient = ResolvedWorldBrief | LegacyWorldBriefForClient

export interface QuestGraphForClient {
  quests: Array<{ id: string; title: string; status: 'active' | 'completed' | 'failed'; created_at_turn: number }>
  nodes: Array<{ id: string; quest_id: string; summary: string; hint: string; status: 'completed' | 'active' | 'failed'; turn: number }>
  edges: Array<{ from_node_id: string; to_node_id: string }>
}

export type ClientMessage =
  | { type: 'initialize' }
  | { type: 'new_game' }
  | { type: 'input'; text: string }
  | { type: 'select_choice'; index: number }
  | { type: 'save' }
  | { type: 'ping' }
  | { type: 'reroll_attributes' }
  | { type: 'confirm_attributes'; attributes: Record<string, number>; profile: PlayerProfileInput }
  | { type: 'reset' }
  | { type: 'insist' }
  | { type: 'abandon' }
  | { type: 'retry' }
  | { type: 'select_world'; draft: WorldCreationDraft }
  | { type: 'select_style'; preset_index: number; story_drivers?: string[]; story_pressure?: string }
  | { type: 'select_style_custom'; tone: string; narrative_style: string; story_drivers: string[]; story_pressure: string }
  | { type: 'get_characters' }
  | { type: 'list_sessions' }
  | { type: 'new_session' }
  | { type: 'switch_session'; session_id: string }
  | { type: 'delete_session'; session_id: string }
  | { type: 'get_llm_config' }
  | { type: 'set_llm_config'; provider: string; api_key: string; model: string; base_url?: string }
  | { type: 'test_llm_config'; provider: string; api_key: string; model: string; base_url?: string }
  | { type: 'list_models'; provider: string; api_key: string; base_url?: string }
  | { type: 'get_gameplay_options' }
  | { type: 'set_gameplay_options'; options: Partial<GameplayOptions> }
  | { type: 'get_quests' }

export type ServerMessage =
  | { type: 'narrative'; text: string; source: string }
  | { type: 'voices'; voices: Array<{ trait_id: string; line: string }> }
  | { type: 'check'; attribute: string; difficulty: string; base_target: number; modifiers: Array<{ label: string; value: number }>; target: number; roll: number; attribute_value: number; total: number; passed: boolean }
  | { type: 'status'; location: string; turn: number }
  | { type: 'error'; message: string; retryable?: boolean }
  | { type: 'init_progress'; step: string }
  | { type: 'init_complete'; doc: any }
  | { type: 'char_create'; attributes: Record<string, number>; attribute_meta: Array<{ id: string; display_name: string; domain: string }>; world_brief: WorldBriefForClient }
  | { type: 'save_result'; saveId: string }
  | { type: 'save_error'; message: string }
  | { type: 'pong' }
  | { type: 'debug_turn_start'; turn: number; input: string }
  | { type: 'debug_step'; step: string; phase: 'start' | 'end'; status?: string; duration_ms?: number; data?: string }
  | { type: 'debug_state'; states: Record<string, unknown> }
  | { type: 'reset_complete' }
  | { type: 'history'; messages: ServerMessage[] }
  | { type: 'insistence_prompt' }
  | { type: 'style_select'; presets: Array<{ id: string; label: string; description: string; story_drivers: string[]; story_pressure: string }> }
  | { type: 'world_builder_config'; config: WorldBuilderConfig }
  | { type: 'session_list'; sessions: Array<{ id: string; label: string; turn: number; location: string; updated_at: number }> }
  | { type: 'characters'; player: CharacterInfo; npcs: CharacterInfo[] }
  | { type: 'llm_config'; config: { provider: string; api_key: string; model: string; base_url?: string } }
  | { type: 'llm_config_saved' }
  | { type: 'llm_test_result'; success: boolean; message: string }
  | { type: 'model_list'; models: string[] }
  | { type: 'no_game' }
  | { type: 'quest_update'; graph: QuestGraphForClient }

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
import type {
  ResolvedWorldBrief,
  WorldBuilderConfig,
  WorldCreationDraft,
} from '@engine/domain/models/world-creation'
