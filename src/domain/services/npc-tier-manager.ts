import type { IStateStore } from '../../infrastructure/storage/interfaces.js'
import type { CharacterDynamicState, MemoryBuffer, GoalQueueEntry } from '../models/character.js'

export interface NPCTierManagerConfig {
  tierCToBThreshold?: number
  tierBInactiveThreshold?: number
}

interface NPCLiteModeFlag {
  is_lite: boolean
  last_interaction_turn: number
}

export class NPCTierManager {
  private stateStore: IStateStore
  private tierCToBThreshold: number
  private tierBInactiveThreshold: number

  constructor(stateStore: IStateStore, config?: NPCTierManagerConfig) {
    this.stateStore = stateStore
    this.tierCToBThreshold = config?.tierCToBThreshold ?? 3
    this.tierBInactiveThreshold = config?.tierBInactiveThreshold ?? 50
  }

  /**
   * Check if a Tier C NPC should be upgraded to Tier B.
   * Returns true if upgrade was performed.
   */
  async checkUpgrade(npc_id: string): Promise<boolean> {
    const state = await this.stateStore.get<CharacterDynamicState>(`character:${npc_id}:state`)
    if (!state) return false

    if (state.tier !== 'C') return false

    if (state.interaction_count >= this.tierCToBThreshold) {
      // Upgrade C → B
      state.tier = 'B'
      await this.stateStore.set(`character:${npc_id}:state`, state)

      // Create MemoryBuffer with max_size=5
      const buffer: MemoryBuffer = {
        npc_id,
        entries: [],
        max_size: 5,
      }
      await this.stateStore.set(`character:${npc_id}:memory_buffer`, buffer)

      // Initialize lite mode flag
      const liteFlag: NPCLiteModeFlag = {
        is_lite: false,
        last_interaction_turn: 0,
      }
      await this.stateStore.set(`npc:lite_mode:${npc_id}`, liteFlag)

      return true
    }

    return false
  }

  /**
   * Check if a Tier B NPC should enter lite mode due to inactivity.
   * Returns true if downgrade to lite mode was performed.
   */
  async checkDowngrade(npc_id: string, current_turn: number): Promise<boolean> {
    const state = await this.stateStore.get<CharacterDynamicState>(`character:${npc_id}:state`)
    if (!state) return false

    if (state.tier !== 'B') return false

    const liteFlag = await this.stateStore.get<NPCLiteModeFlag>(`npc:lite_mode:${npc_id}`)
    if (!liteFlag || liteFlag.is_lite) return false

    const inactiveTurns = current_turn - liteFlag.last_interaction_turn
    if (inactiveTurns <= this.tierBInactiveThreshold) return false

    // Compress memory buffer to a single summary entry
    const bufferKey = `character:${npc_id}:memory_buffer`
    const buffer = await this.stateStore.get<MemoryBuffer>(bufferKey)

    if (buffer && buffer.entries.length > 1) {
      const combinedSummary = buffer.entries
        .map((e) => e.subjective_summary)
        .join(' ')

      buffer.entries = [
        {
          event_id: 'compressed',
          subjective_summary: combinedSummary,
          distortion_type: 'NONE',
          recorded_at_turn: current_turn,
        },
      ]
      await this.stateStore.set(bufferKey, buffer)
    }

    // Set lite mode flag
    const updatedFlag: NPCLiteModeFlag = {
      is_lite: true,
      last_interaction_turn: liteFlag.last_interaction_turn,
    }
    await this.stateStore.set(`npc:lite_mode:${npc_id}`, updatedFlag)

    return true
  }

  /**
   * Promote a Tier B NPC to Tier A. Only triggered by narrative events or author config.
   */
  async promoteTierA(npc_id: string, initial_goals: GoalQueueEntry[]): Promise<void> {
    const state = await this.stateStore.get<CharacterDynamicState>(`character:${npc_id}:state`)
    if (!state) {
      throw new Error(`CharacterDynamicState not found for NPC: ${npc_id}`)
    }

    if (state.tier !== 'B') {
      throw new Error(`Cannot promote NPC ${npc_id} from tier ${state.tier} to A. Must be tier B.`)
    }

    state.tier = 'A'
    state.goal_queue = initial_goals
    await this.stateStore.set(`character:${npc_id}:state`, state)

    // Upgrade MemoryBuffer to max_size=20
    const bufferKey = `character:${npc_id}:memory_buffer`
    const buffer = await this.stateStore.get<MemoryBuffer>(bufferKey)

    if (buffer) {
      buffer.max_size = 20
      await this.stateStore.set(bufferKey, buffer)
    } else {
      const newBuffer: MemoryBuffer = {
        npc_id,
        entries: [],
        max_size: 20,
      }
      await this.stateStore.set(bufferKey, newBuffer)
    }

    // Ensure lite mode is cleared
    const liteFlag: NPCLiteModeFlag = {
      is_lite: false,
      last_interaction_turn: 0,
    }
    await this.stateStore.set(`npc:lite_mode:${npc_id}`, liteFlag)
  }

  /**
   * Check if an NPC is currently in B-lite mode.
   */
  async isLiteMode(npc_id: string): Promise<boolean> {
    const liteFlag = await this.stateStore.get<NPCLiteModeFlag>(`npc:lite_mode:${npc_id}`)
    return liteFlag?.is_lite ?? false
  }

  /**
   * Restore an NPC from B-lite mode when they are interacted with again.
   */
  async restoreFromLite(npc_id: string): Promise<void> {
    const liteFlag = await this.stateStore.get<NPCLiteModeFlag>(`npc:lite_mode:${npc_id}`)
    if (!liteFlag || !liteFlag.is_lite) return

    const updatedFlag: NPCLiteModeFlag = {
      is_lite: false,
      last_interaction_turn: liteFlag.last_interaction_turn,
    }
    await this.stateStore.set(`npc:lite_mode:${npc_id}`, updatedFlag)
  }

  /**
   * Update the last_interaction_turn for an NPC (called when NPC is interacted with).
   */
  async recordInteraction(npc_id: string, current_turn: number): Promise<void> {
    let liteFlag = await this.stateStore.get<NPCLiteModeFlag>(`npc:lite_mode:${npc_id}`)

    if (!liteFlag) {
      liteFlag = { is_lite: false, last_interaction_turn: current_turn }
    } else {
      liteFlag.last_interaction_turn = current_turn
    }

    await this.stateStore.set(`npc:lite_mode:${npc_id}`, liteFlag)
  }
}
