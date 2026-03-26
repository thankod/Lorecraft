import type {
  IStateStore,
  IEventStore,
  ISessionStore,
  ILongTermMemoryStore,
} from '../../infrastructure/storage/interfaces.js'
import type { SaveFile } from '../models/session.js'
import type { GenesisDocument } from '../models/genesis.js'
import type { CharacterDynamicState, MemoryBuffer, ConversationHistory } from '../models/character.js'
import type { TraitWeight } from '../models/trait.js'
import type { ReflectionInjection, NPCInjection } from '../models/injection.js'
import type { IInjectionQueueManager } from './injection-queue-manager.js'
import { uuid } from '../../utils/uuid.js'

// ============================================================
// SaveLoadSystem
// ============================================================

export class SaveLoadSystem {
  private readonly stateStore: IStateStore
  private readonly eventStore: IEventStore
  private readonly sessionStore: ISessionStore
  private readonly longTermMemoryStore: ILongTermMemoryStore
  private readonly injectionQueueManager: IInjectionQueueManager

  constructor(
    stateStore: IStateStore,
    eventStore: IEventStore,
    sessionStore: ISessionStore,
    longTermMemoryStore: ILongTermMemoryStore,
    injectionQueueManager: IInjectionQueueManager,
  ) {
    this.stateStore = stateStore
    this.eventStore = eventStore
    this.sessionStore = sessionStore
    this.longTermMemoryStore = longTermMemoryStore
    this.injectionQueueManager = injectionQueueManager
  }

  // ---- Save ----

  async save(genesisDocumentId: string, currentTurn: number): Promise<string> {
    const saveId = uuid()

    // Gather world state
    const worldStateKeys = [
      ...(await this.stateStore.listByPrefix('location:')),
      ...(await this.stateStore.listByPrefix('faction:')),
      ...(await this.stateStore.listByPrefix('game:time')),
    ]
    const worldStateSnapshot: Record<string, unknown> = {}
    for (const key of worldStateKeys) {
      worldStateSnapshot[key] = await this.stateStore.get(key)
    }

    // Gather character states
    const characterKeys = await this.stateStore.listByPrefix('character:')
    const allCharacterStates: Record<string, unknown> = {}
    for (const key of characterKeys) {
      allCharacterStates[key] = await this.stateStore.get(key)
    }

    // Gather trait weights
    const traitKeys = await this.stateStore.listByPrefix('player:traits:')
    const traitWeights: TraitWeight[] = []
    for (const key of traitKeys) {
      const tw = await this.stateStore.get<TraitWeight>(key)
      if (tw) traitWeights.push(tw)
    }

    // Gather conversation histories
    const convKeys = await this.stateStore.listByPrefix('conversation:')
    const conversationHistories: Record<string, unknown> = {}
    for (const key of convKeys) {
      conversationHistories[key] = await this.stateStore.get(key)
    }

    // Gather memory buffers
    const memKeys = await this.stateStore.listByPrefix('memory:buffer:')
    for (const key of memKeys) {
      allCharacterStates[key] = await this.stateStore.get(key)
    }

    // Snapshot injection queues
    const reflectionQueue = this.injectionQueueManager.peekReflections()
    const npcQueues: Record<string, NPCInjection[]> = {}
    // We can't enumerate all NPC IDs from the interface, so we save what we have in character states
    for (const key of characterKeys) {
      if (key.endsWith(':state')) {
        const state = allCharacterStates[key] as CharacterDynamicState | null
        if (state) {
          const injections = this.injectionQueueManager.peekNPCInjections(state.npc_id)
          if (injections.length > 0) {
            npcQueues[state.npc_id] = injections
          }
        }
      }
    }

    const saveFile: SaveFile = {
      save_id: saveId,
      genesis_document_id: genesisDocumentId,
      saved_at_turn: currentTurn,
      world_state_snapshot: worldStateSnapshot,
      all_character_states: allCharacterStates,
      trait_weights: traitWeights,
      conversation_histories: conversationHistories,
      injection_queues_snapshot: {
        reflection: reflectionQueue,
        npc_queues: npcQueues,
      },
    }

    await this.sessionStore.saveSaveFile(saveFile)
    return saveId
  }

  // ---- Load ----

  async load(saveId: string): Promise<{ genesisDoc: GenesisDocument; turn: number } | null> {
    const saveFile = await this.sessionStore.loadSaveFile(saveId)
    if (!saveFile) return null

    const genesisDoc = await this.sessionStore.loadGenesis(saveFile.genesis_document_id)
    if (!genesisDoc) return null

    // Restore world state
    for (const [key, value] of Object.entries(saveFile.world_state_snapshot)) {
      await this.stateStore.set(key, value)
    }

    // Restore character states + memory buffers
    for (const [key, value] of Object.entries(saveFile.all_character_states)) {
      await this.stateStore.set(key, value)
    }

    // Restore trait weights
    for (const tw of saveFile.trait_weights) {
      await this.stateStore.set(`player:traits:${tw.trait_id}`, tw)
    }

    // Restore conversation histories
    for (const [key, value] of Object.entries(saveFile.conversation_histories)) {
      await this.stateStore.set(key, value)
    }

    // Restore injection queues
    for (const reflection of saveFile.injection_queues_snapshot.reflection) {
      this.injectionQueueManager.enqueueReflection(reflection)
    }
    for (const [_npcId, injections] of Object.entries(saveFile.injection_queues_snapshot.npc_queues)) {
      for (const injection of injections) {
        this.injectionQueueManager.enqueueNPC(injection)
      }
    }

    return { genesisDoc, turn: saveFile.saved_at_turn }
  }

  // ---- List Saves ----

  async listSaves(genesisDocumentId: string): Promise<string[]> {
    return this.sessionStore.listSaves(genesisDocumentId)
  }

  // ---- Crash Recovery ----

  async checkAndRecoverConsistency(): Promise<{ recovered: boolean; details: string }> {
    const allEvents = await this.eventStore.getAllTier1()
    if (allEvents.length === 0) {
      return { recovered: false, details: 'No events to check' }
    }

    const latestEvent = allEvents[allEvents.length - 1]
    const fullEvent = await this.eventStore.getTiers(latestEvent.id, [1, 2, 3, 4])

    if (!fullEvent) {
      return { recovered: false, details: 'Latest event incomplete' }
    }

    // Check if event's state_snapshot was applied
    const stateSnapshot = (fullEvent as Record<string, unknown>).state_snapshot as
      | { location_state: string; participant_states: Record<string, string> }
      | undefined

    if (!stateSnapshot) {
      return { recovered: false, details: 'No state snapshot to verify' }
    }

    // Simple heuristic: check if any participant state seems stale
    let needsRecovery = false
    for (const [participantId, expectedState] of Object.entries(stateSnapshot.participant_states)) {
      const currentState = await this.stateStore.get<string>(
        `character:${participantId}:last_event`,
      )
      if (currentState !== latestEvent.id && expectedState) {
        // State not updated for latest event
        await this.stateStore.set(`character:${participantId}:last_event`, latestEvent.id)
        needsRecovery = true
      }
    }

    if (needsRecovery) {
      return { recovered: true, details: `Recovered state consistency for event ${latestEvent.id}` }
    }

    return { recovered: false, details: 'State is consistent' }
  }
}
