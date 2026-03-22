import type { Event, EventTier1, EventTier2, EventTier3, EventTier4 } from '../../domain/models/event.js'
import type { GameTimestamp } from '../../domain/models/common.js'
import type { LoreEntry } from '../../domain/models/lore.js'
import type { GenesisDocument } from '../../domain/models/genesis.js'
import type { SaveFile } from '../../domain/models/session.js'

// ============================================================
// EventStore: append-only, immutable event log
// ============================================================

export interface IEventStore {
  append(event: Event): Promise<void>
  getTier1(event_id: string): Promise<EventTier1 | null>
  getTier2(event_id: string): Promise<EventTier2 | null>
  getTier3(event_id: string): Promise<EventTier3 | null>
  getTier4(event_id: string): Promise<EventTier4 | null>
  getTiers(event_id: string, tiers: number[]): Promise<Partial<Event> | null>
  scanByTimeRange(from: GameTimestamp, to: GameTimestamp): Promise<EventTier1[]>
  scanByParticipant(npc_id: string, limit: number): Promise<EventTier1[]>
  getAllTier1(): Promise<EventTier1[]>
}

// ============================================================
// StateStore: generic KV store with namespace convention
// ============================================================

export interface IStateStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  listByPrefix(prefix: string): Promise<string[]>
}

// ============================================================
// LoreStore: structured lore with causal chains
// ============================================================

export interface ILoreStore {
  append(entry: LoreEntry): Promise<void>
  findBySubject(subject_id: string): Promise<LoreEntry[]>
  findByContentHash(hash: string): Promise<LoreEntry | null>
  findByFactType(fact_type: string): Promise<LoreEntry[]>
  getById(id: string): Promise<LoreEntry | null>
  update(id: string, updates: Partial<LoreEntry>): Promise<void>
}

// ============================================================
// LongTermMemoryStore: evicted MemoryBuffer entries for Tier A NPCs
// ============================================================

export interface LongTermMemoryEntry {
  event_id: string
  npc_id: string
  subjective_summary: string
  participant_ids: string[]
  location_id: string
  recorded_at_turn: number
  distortion_type: string
}

export interface ILongTermMemoryStore {
  append(entry: LongTermMemoryEntry): Promise<void>
  findByParticipant(npc_id: string, participant_id: string, limit: number): Promise<LongTermMemoryEntry[]>
  findByLocation(npc_id: string, location_id: string, limit: number): Promise<LongTermMemoryEntry[]>
  findRecent(npc_id: string, limit: number): Promise<LongTermMemoryEntry[]>
}

// ============================================================
// SessionStore: genesis documents and save files
// ============================================================

export interface ISessionStore {
  saveGenesis(doc: GenesisDocument): Promise<void>
  loadGenesis(genesis_id: string): Promise<GenesisDocument | null>
  saveSaveFile(save: SaveFile): Promise<void>
  loadSaveFile(save_id: string): Promise<SaveFile | null>
  listSaves(genesis_id: string): Promise<string[]>
}
