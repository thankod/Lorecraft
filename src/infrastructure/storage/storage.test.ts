import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryEventStore } from './event-store.js'
import { InMemoryStateStore } from './state-store.js'
import { InMemoryLoreStore } from './lore-store.js'
import { InMemoryLongTermMemoryStore } from './long-term-memory-store.js'
import { InMemorySessionStore } from './session-store.js'
import type { Event } from '../../domain/models/event.js'
import type { LoreEntry } from '../../domain/models/lore.js'
import type { LongTermMemoryEntry } from './interfaces.js'
import type { GenesisDocument } from '../../domain/models/genesis.js'
import type { SaveFile } from '../../domain/models/session.js'

// ---------------------------------------------------------------------------
// Helpers: realistic test data factories
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt_001',
    title: 'Confrontation at Police Station',
    timestamp: { day: 1, hour: 14, turn: 3 },
    location_id: 'loc_police_station',
    participant_ids: ['player', 'npc_chief'],
    tags: ['DIALOGUE', 'CONFLICT'],
    weight: 'SIGNIFICANT',
    force_level: 0,
    created_at: 1700000000000,
    summary: 'Player confronted the police chief about corruption',
    choice_signals: { confrontational: 0.8, diplomatic: 0.2 },
    context: 'Player has gathered corruption evidence',
    related_event_ids: [],
    state_snapshot: {
      location_state: 'Police station lobby',
      participant_states: { npc_chief: 'nervous' },
    },
    narrative_text: 'You step into the chief\'s office...',
    ...overrides,
  }
}

function makeLoreEntry(overrides: Partial<LoreEntry> = {}): LoreEntry {
  return {
    id: 'lore_001',
    content: 'The chief has a secret deal with the gang',
    fact_type: 'RELATIONSHIP',
    authority_level: 'AI_CANONICALIZED',
    subject_ids: ['npc_chief', 'faction_gang'],
    source_event_id: 'evt_001',
    created_at_turn: 10,
    causal_chain: [],
    related_lore_ids: [],
    content_hash: 'hash_abc123',
    ...overrides,
  }
}

function makeLongTermMemory(overrides: Partial<LongTermMemoryEntry> = {}): LongTermMemoryEntry {
  return {
    event_id: 'evt_001',
    npc_id: 'npc_chief',
    subjective_summary: 'That troublemaker came asking questions again',
    participant_ids: ['player', 'npc_deputy'],
    location_id: 'loc_police_station',
    recorded_at_turn: 5,
    distortion_type: 'INTENT_MISREAD',
    ...overrides,
  }
}

function makeGenesisDocument(overrides: Partial<GenesisDocument> = {}): GenesisDocument {
  const tierABase = {
    background: 'bg',
    surface_motivation: 'sm',
    deep_motivation: 'dm',
    secrets: [],
    initial_relationships: {},
  }
  return {
    id: 'gen_001',
    created_at: 1700000000000,
    world_setting: {
      background: 'A noir city plagued by corruption',
      tone: 'dark',
      core_conflict: 'Power struggle between factions',
      hidden_secrets: ['The mayor is the real boss'],
      factions: [],
    },
    narrative_structure: {
      final_goal_description: 'Expose the conspiracy',
      inciting_event: {
        title: 'A mysterious letter',
        description: 'Player receives a letter',
        location_id: 'loc_apartment',
        participant_ids: ['player'],
        narrative_text: 'An envelope slides under your door...',
      },
      phases: [{ phase_id: 'p1', description: 'Investigation', direction_summary: 'Gather clues' }],
    },
    characters: {
      player_character: { id: 'player', name: 'Detective', background: 'Former cop' },
      tier_a_npcs: [
        { id: 'npc_chief', name: 'Chief', ...tierABase },
        { id: 'npc_mayor', name: 'Mayor', ...tierABase },
        { id: 'npc_informant', name: 'Informant', ...tierABase },
      ],
      tier_b_npcs: [],
    },
    initial_locations: [
      { id: 'loc_apartment', name: 'Apartment', region_id: 'r1', description: 'Dingy apartment', initial_status: 'quiet', connections: [] },
    ],
    ...overrides,
  }
}

function makeSaveFile(overrides: Partial<SaveFile> = {}): SaveFile {
  return {
    save_id: 'save_001',
    genesis_document_id: 'gen_001',
    saved_at_turn: 15,
    world_state_snapshot: { weather: 'rain' },
    all_character_states: { npc_chief: { emotion: 'nervous' } },
    trait_weights: [
      { trait_id: 'trait_confrontational', trait_type: 'EXPRESSION', current_weight: 0.75, last_updated_turn: 14 },
    ],
    conversation_histories: {},
    injection_queues_snapshot: {
      reflection: [],
      npc_queues: {},
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// InMemoryEventStore
// ---------------------------------------------------------------------------

describe('InMemoryEventStore', () => {
  let store: InMemoryEventStore

  beforeEach(() => {
    store = new InMemoryEventStore()
  })

  it('appends an event and retrieves each tier', async () => {
    const event = makeEvent()
    await store.append(event)

    const t1 = await store.getTier1('evt_001')
    expect(t1).not.toBeNull()
    expect(t1!.id).toBe('evt_001')
    expect(t1!.title).toBe('Confrontation at Police Station')
    expect(t1!.participant_ids).toEqual(['player', 'npc_chief'])

    const t2 = await store.getTier2('evt_001')
    expect(t2).not.toBeNull()
    expect(t2!.summary).toBe('Player confronted the police chief about corruption')
    expect(t2!.choice_signals).toEqual({ confrontational: 0.8, diplomatic: 0.2 })

    const t3 = await store.getTier3('evt_001')
    expect(t3).not.toBeNull()
    expect(t3!.context).toBe('Player has gathered corruption evidence')
    expect(t3!.related_event_ids).toEqual([])

    const t4 = await store.getTier4('evt_001')
    expect(t4).not.toBeNull()
    expect(t4!.narrative_text).toContain('chief\'s office')
  })

  it('returns null for non-existent event tiers', async () => {
    expect(await store.getTier1('nonexistent')).toBeNull()
    expect(await store.getTier2('nonexistent')).toBeNull()
    expect(await store.getTier3('nonexistent')).toBeNull()
    expect(await store.getTier4('nonexistent')).toBeNull()
  })

  it('silently ignores duplicate event_id (idempotent append)', async () => {
    const event = makeEvent()
    await store.append(event)

    const modifiedEvent = makeEvent({ title: 'Modified Title' })
    await store.append(modifiedEvent)

    const t1 = await store.getTier1('evt_001')
    expect(t1!.title).toBe('Confrontation at Police Station')
  })

  it('scans events by time range', async () => {
    await store.append(makeEvent({ id: 'evt_d1h10', timestamp: { day: 1, hour: 10, turn: 0 } }))
    await store.append(makeEvent({ id: 'evt_d1h14', timestamp: { day: 1, hour: 14, turn: 0 } }))
    await store.append(makeEvent({ id: 'evt_d2h08', timestamp: { day: 2, hour: 8, turn: 0 } }))
    await store.append(makeEvent({ id: 'evt_d3h00', timestamp: { day: 3, hour: 0, turn: 0 } }))

    const results = await store.scanByTimeRange(
      { day: 1, hour: 12, turn: 0 },
      { day: 2, hour: 10, turn: 0 },
    )

    expect(results).toHaveLength(2)
    expect(results.map(r => r.id)).toEqual(['evt_d1h14', 'evt_d2h08'])
  })

  it('scans events by participant with limit', async () => {
    await store.append(makeEvent({ id: 'evt_a', participant_ids: ['npc_chief'] }))
    await store.append(makeEvent({ id: 'evt_b', participant_ids: ['npc_chief'] }))
    await store.append(makeEvent({ id: 'evt_c', participant_ids: ['npc_chief'] }))

    const results = await store.scanByParticipant('npc_chief', 2)
    expect(results).toHaveLength(2)
    // Returns most recent first (reversed insertion order)
    expect(results.map(r => r.id)).toEqual(['evt_c', 'evt_b'])
  })

  it('returns empty array for unknown participant', async () => {
    const results = await store.scanByParticipant('unknown_npc', 10)
    expect(results).toEqual([])
  })

  it('getAllTier1 returns all appended events', async () => {
    await store.append(makeEvent({ id: 'evt_x' }))
    await store.append(makeEvent({ id: 'evt_y' }))

    const all = await store.getAllTier1()
    expect(all).toHaveLength(2)
    expect(all.map(e => e.id).sort()).toEqual(['evt_x', 'evt_y'])
  })
})

// ---------------------------------------------------------------------------
// InMemoryStateStore
// ---------------------------------------------------------------------------

describe('InMemoryStateStore', () => {
  let store: InMemoryStateStore

  beforeEach(() => {
    store = new InMemoryStateStore()
  })

  it('returns null for missing key', async () => {
    expect(await store.get('missing')).toBeNull()
  })

  it('sets and gets a value', async () => {
    await store.set('npc:chief:emotion', 'nervous')
    expect(await store.get<string>('npc:chief:emotion')).toBe('nervous')
  })

  it('overwrites existing value', async () => {
    await store.set('npc:chief:emotion', 'nervous')
    await store.set('npc:chief:emotion', 'angry')
    expect(await store.get<string>('npc:chief:emotion')).toBe('angry')
  })

  it('deletes a key', async () => {
    await store.set('temp:data', 42)
    await store.delete('temp:data')
    expect(await store.get('temp:data')).toBeNull()
  })

  it('delete on non-existent key is a no-op', async () => {
    await store.delete('nonexistent')
    // no error thrown
  })

  it('lists keys by prefix', async () => {
    await store.set('npc:chief:emotion', 'angry')
    await store.set('npc:chief:location', 'loc_police')
    await store.set('npc:deputy:emotion', 'calm')
    await store.set('world:weather', 'rain')

    const npcChiefKeys = await store.listByPrefix('npc:chief:')
    expect(npcChiefKeys.sort()).toEqual(['npc:chief:emotion', 'npc:chief:location'])

    const allNpc = await store.listByPrefix('npc:')
    expect(allNpc).toHaveLength(3)
  })

  it('returns empty array when no keys match prefix', async () => {
    await store.set('world:weather', 'rain')
    expect(await store.listByPrefix('npc:')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// InMemoryLoreStore
// ---------------------------------------------------------------------------

describe('InMemoryLoreStore', () => {
  let store: InMemoryLoreStore

  beforeEach(() => {
    store = new InMemoryLoreStore()
  })

  it('appends and retrieves by id', async () => {
    const entry = makeLoreEntry()
    await store.append(entry)

    const found = await store.getById('lore_001')
    expect(found).not.toBeNull()
    expect(found!.content).toBe('The chief has a secret deal with the gang')
  })

  it('finds entries by subject', async () => {
    await store.append(makeLoreEntry({ id: 'lore_a', subject_ids: ['npc_chief'] }))
    await store.append(makeLoreEntry({ id: 'lore_b', subject_ids: ['npc_chief', 'npc_mayor'], content_hash: 'hash_b' }))
    await store.append(makeLoreEntry({ id: 'lore_c', subject_ids: ['npc_mayor'], content_hash: 'hash_c' }))

    const chiefLore = await store.findBySubject('npc_chief')
    expect(chiefLore).toHaveLength(2)
    expect(chiefLore.map(e => e.id).sort()).toEqual(['lore_a', 'lore_b'])

    const mayorLore = await store.findBySubject('npc_mayor')
    expect(mayorLore).toHaveLength(2)
  })

  it('returns empty array for unknown subject', async () => {
    expect(await store.findBySubject('unknown')).toEqual([])
  })

  it('finds entry by content hash', async () => {
    const entry = makeLoreEntry()
    await store.append(entry)

    const found = await store.findByContentHash('hash_abc123')
    expect(found).not.toBeNull()
    expect(found!.id).toBe('lore_001')
  })

  it('returns null for unknown content hash', async () => {
    expect(await store.findByContentHash('nonexistent')).toBeNull()
  })

  it('finds entries by fact type', async () => {
    await store.append(makeLoreEntry({ id: 'lore_r1', fact_type: 'RELATIONSHIP', content_hash: 'h1' }))
    await store.append(makeLoreEntry({ id: 'lore_w1', fact_type: 'WORLD', content_hash: 'h2' }))
    await store.append(makeLoreEntry({ id: 'lore_r2', fact_type: 'RELATIONSHIP', content_hash: 'h3' }))

    const relationships = await store.findByFactType('RELATIONSHIP')
    expect(relationships).toHaveLength(2)
    expect(relationships.map(e => e.id).sort()).toEqual(['lore_r1', 'lore_r2'])
  })

  it('updates an existing entry', async () => {
    await store.append(makeLoreEntry())

    await store.update('lore_001', { content: 'Updated: The chief is innocent' })

    const updated = await store.getById('lore_001')
    expect(updated!.content).toBe('Updated: The chief is innocent')
    // Other fields remain unchanged
    expect(updated!.fact_type).toBe('RELATIONSHIP')
  })

  it('update rebuilds content hash index when hash changes', async () => {
    await store.append(makeLoreEntry())

    await store.update('lore_001', { content_hash: 'hash_new' })

    expect(await store.findByContentHash('hash_abc123')).toBeNull()
    const found = await store.findByContentHash('hash_new')
    expect(found).not.toBeNull()
    expect(found!.id).toBe('lore_001')
  })

  it('update rebuilds subject index when subjects change', async () => {
    await store.append(makeLoreEntry({ subject_ids: ['npc_chief'] }))

    await store.update('lore_001', { subject_ids: ['npc_mayor'] })

    expect(await store.findBySubject('npc_chief')).toEqual([])
    const mayorLore = await store.findBySubject('npc_mayor')
    expect(mayorLore).toHaveLength(1)
    expect(mayorLore[0].id).toBe('lore_001')
  })

  it('update on non-existent id is a no-op', async () => {
    await store.update('nonexistent', { content: 'nope' })
    expect(await store.getById('nonexistent')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// InMemoryLongTermMemoryStore
// ---------------------------------------------------------------------------

describe('InMemoryLongTermMemoryStore', () => {
  let store: InMemoryLongTermMemoryStore

  beforeEach(() => {
    store = new InMemoryLongTermMemoryStore()
  })

  it('appends and finds by participant', async () => {
    await store.append(makeLongTermMemory({ event_id: 'evt_1', participant_ids: ['player', 'npc_deputy'], recorded_at_turn: 5 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_2', participant_ids: ['player'], recorded_at_turn: 8 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_3', participant_ids: ['npc_deputy'], recorded_at_turn: 10 }))

    const withPlayer = await store.findByParticipant('npc_chief', 'player', 10)
    expect(withPlayer).toHaveLength(2)
    // Sorted by turn descending
    expect(withPlayer[0].event_id).toBe('evt_2')
    expect(withPlayer[1].event_id).toBe('evt_1')
  })

  it('findByParticipant respects limit', async () => {
    await store.append(makeLongTermMemory({ event_id: 'evt_1', participant_ids: ['player'], recorded_at_turn: 1 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_2', participant_ids: ['player'], recorded_at_turn: 5 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_3', participant_ids: ['player'], recorded_at_turn: 10 }))

    const limited = await store.findByParticipant('npc_chief', 'player', 2)
    expect(limited).toHaveLength(2)
    expect(limited[0].recorded_at_turn).toBe(10)
    expect(limited[1].recorded_at_turn).toBe(5)
  })

  it('returns empty for unknown participant', async () => {
    expect(await store.findByParticipant('npc_chief', 'unknown', 10)).toEqual([])
  })

  it('finds by location', async () => {
    await store.append(makeLongTermMemory({ event_id: 'evt_1', location_id: 'loc_police', recorded_at_turn: 3 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_2', location_id: 'loc_market', recorded_at_turn: 7 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_3', location_id: 'loc_police', recorded_at_turn: 12 }))

    const atPolice = await store.findByLocation('npc_chief', 'loc_police', 10)
    expect(atPolice).toHaveLength(2)
    // Sorted by turn descending
    expect(atPolice[0].recorded_at_turn).toBe(12)
    expect(atPolice[1].recorded_at_turn).toBe(3)
  })

  it('findRecent returns entries sorted by turn desc', async () => {
    await store.append(makeLongTermMemory({ event_id: 'evt_1', recorded_at_turn: 3 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_2', recorded_at_turn: 12 }))
    await store.append(makeLongTermMemory({ event_id: 'evt_3', recorded_at_turn: 7 }))

    const recent = await store.findRecent('npc_chief', 2)
    expect(recent).toHaveLength(2)
    expect(recent[0].event_id).toBe('evt_2')
    expect(recent[1].event_id).toBe('evt_3')
  })

  it('findRecent returns empty for unknown npc', async () => {
    expect(await store.findRecent('unknown_npc', 5)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// InMemorySessionStore
// ---------------------------------------------------------------------------

describe('InMemorySessionStore', () => {
  let store: InMemorySessionStore

  beforeEach(() => {
    store = new InMemorySessionStore()
  })

  it('saves and loads a genesis document', async () => {
    const doc = makeGenesisDocument()
    await store.saveGenesis(doc)

    const loaded = await store.loadGenesis('gen_001')
    expect(loaded).not.toBeNull()
    expect(loaded!.id).toBe('gen_001')
    expect(loaded!.world_setting.tone).toBe('dark')
  })

  it('returns null for non-existent genesis', async () => {
    expect(await store.loadGenesis('nonexistent')).toBeNull()
  })

  it('saves and loads a save file', async () => {
    const save = makeSaveFile()
    await store.saveSaveFile(save)

    const loaded = await store.loadSaveFile('save_001')
    expect(loaded).not.toBeNull()
    expect(loaded!.save_id).toBe('save_001')
    expect(loaded!.saved_at_turn).toBe(15)
    expect(loaded!.trait_weights).toHaveLength(1)
  })

  it('returns null for non-existent save file', async () => {
    expect(await store.loadSaveFile('nonexistent')).toBeNull()
  })

  it('lists save ids by genesis document id', async () => {
    await store.saveSaveFile(makeSaveFile({ save_id: 'save_a', genesis_document_id: 'gen_001' }))
    await store.saveSaveFile(makeSaveFile({ save_id: 'save_b', genesis_document_id: 'gen_001' }))
    await store.saveSaveFile(makeSaveFile({ save_id: 'save_c', genesis_document_id: 'gen_002' }))

    const gen001Saves = await store.listSaves('gen_001')
    expect(gen001Saves.sort()).toEqual(['save_a', 'save_b'])

    const gen002Saves = await store.listSaves('gen_002')
    expect(gen002Saves).toEqual(['save_c'])
  })

  it('returns empty array when no saves exist for genesis', async () => {
    expect(await store.listSaves('gen_999')).toEqual([])
  })
})
