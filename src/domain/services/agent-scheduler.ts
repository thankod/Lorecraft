import type { IStateStore } from '../../infrastructure/storage/interfaces.js'
import type { CharacterDynamicState } from '../models/character.js'
import type { NPCIntentGenerator, NPCIntentResult } from './npc-intent-generator.js'
import type { NPCTierManager } from './npc-tier-manager.js'

export class AgentScheduler {
  private stateStore: IStateStore
  private intentGenerator: NPCIntentGenerator
  private tierManager: NPCTierManager

  constructor(
    stateStore: IStateStore,
    intentGenerator: NPCIntentGenerator,
    tierManager: NPCTierManager,
  ) {
    this.stateStore = stateStore
    this.intentGenerator = intentGenerator
    this.tierManager = tierManager
  }

  /**
   * Run end-of-turn processing for all NPCs.
   * - For Tier A NPCs with IN_PROGRESS goals and is_active=false: generate intent
   * - For all NPCs: check upgrade/downgrade conditions
   *
   * @param current_turn - The current game turn number
   * @param active_npc_id - The NPC currently in conversation with the player (skip intent generation)
   * @returns List of generated NPC intents for the caller to process through the pipeline
   */
  async runEndOfTurn(
    current_turn: number,
    active_npc_id: string | null,
  ): Promise<NPCIntentResult[]> {
    const npcKeys = await this.stateStore.listByPrefix('character:')
    const intents: NPCIntentResult[] = []

    // Filter to only state keys (pattern: character:{id}:state)
    const stateKeys = npcKeys.filter((k) => k.endsWith(':state'))

    for (const key of stateKeys) {
      const state = await this.stateStore.get<CharacterDynamicState>(key)
      if (!state) continue

      const npc_id = state.npc_id

      // Phase 1: Intent generation for Tier A NPCs
      if (
        state.tier === 'A' &&
        npc_id !== active_npc_id &&
        !state.is_active &&
        state.goal_queue.some((g) => g.status === 'IN_PROGRESS')
      ) {
        try {
          const intent = await this.intentGenerator.generateIntent(npc_id)
          intents.push(intent)
        } catch {
          // Log and continue — a single NPC failure should not block the loop
        }
      }

      // Phase 2: Check upgrade (C → B)
      await this.tierManager.checkUpgrade(npc_id)

      // Phase 3: Check downgrade (B → B-lite)
      await this.tierManager.checkDowngrade(npc_id, current_turn)
    }

    return intents
  }
}
