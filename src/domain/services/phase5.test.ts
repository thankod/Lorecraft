import { describe, it, expect, beforeEach } from 'vitest'
import { InitializationAgent } from './initialization-agent.js'
import { SaveLoadSystem } from './save-load-system.js'
import {
  ExtensionConfigLoader,
  AuthorTooling,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_COGNITIVE_VOICES,
  DEFAULT_TIER_C_TEMPLATES,
} from './extension-config.js'
import { InMemoryInjectionQueueManager } from './injection-queue-manager.js'
import { InMemoryStateStore } from '../../infrastructure/storage/state-store.js'
import { InMemoryEventStore } from '../../infrastructure/storage/event-store.js'
import { InMemoryLoreStore } from '../../infrastructure/storage/lore-store.js'
import { InMemoryLongTermMemoryStore } from '../../infrastructure/storage/long-term-memory-store.js'
import { InMemorySessionStore } from '../../infrastructure/storage/session-store.js'
import { AgentRunner } from '../../ai/runner/agent-runner.js'
import type { ILLMProvider, LLMMessage, LLMResponse } from '../../ai/runner/llm-provider.js'
import type { GenesisDocument } from '../models/genesis.js'

// ============================================================
// Mock LLM Provider
// ============================================================

class MockLLMProvider implements ILLMProvider {
  responses: string[] = []
  private callIndex = 0

  queueResponse(response: string): void {
    this.responses.push(response)
  }

  async call(_messages: LLMMessage[]): Promise<LLMResponse> {
    const content = this.callIndex < this.responses.length
      ? this.responses[this.callIndex++]
      : '{}'
    return { content, usage: { input_tokens: 10, output_tokens: 10 } }
  }
}

// ============================================================
// Test Genesis Document
// ============================================================

function makeTestGenesisDoc(): GenesisDocument {
  return {
    id: 'genesis_test_1',
    created_at: Date.now(),
    world_setting: {
      background: 'A noir city plagued by corruption',
      tone: 'Dark political thriller',
      core_conflict: 'Power struggle between factions',
      hidden_secrets: ['The mayor is controlled by the syndicate'],
      factions: [
        {
          id: 'police',
          name: '警局',
          description: '名义上维护秩序',
          initial_strength: 'MODERATE',
          initial_resources: '有限的预算和人力',
          initial_relationships: {
            syndicate: { relation_type: 'HOSTILE', description: '表面对立' },
          },
        },
        {
          id: 'syndicate',
          name: '辛迪加',
          description: '控制地下经济',
          initial_strength: 'STRONG',
          initial_resources: '大量非法资金',
          initial_relationships: {
            police: { relation_type: 'HOSTILE', description: '暗中渗透' },
          },
        },
      ],
    },
    narrative_structure: {
      final_goal_description: '揭露真相，做出最终选择',
      inciting_event: {
        title: '神秘命案',
        description: '一具尸体出现在码头',
        location_id: 'dock',
        participant_ids: ['player'],
        narrative_text: '清晨的薄雾中，码头工人发现了一具尸体……',
      },
      phases: [
        {
          phase_id: 'phase_1',
          description: '调查阶段',
          direction_summary: '调查命案，收集线索',
        },
        {
          phase_id: 'phase_2',
          description: '对峙阶段',
          direction_summary: '面对嫌疑人，揭露秘密',
        },
        {
          phase_id: 'phase_3',
          description: '抉择阶段',
          direction_summary: '做出最终决定',
        },
      ],
    },
    characters: {
      player_character: {
        id: 'player',
        name: '探长',
        background: '一个疲惫但执着的调查者',
      },
      tier_a_npcs: [
        {
          id: 'npc_chen',
          name: '陈督察',
          background: '警局老手，知道太多秘密',
          surface_motivation: '维护治安',
          deep_motivation: '保护自己的家人',
          secrets: ['曾收受辛迪加贿赂'],
          initial_relationships: {
            npc_li: '老搭档',
            npc_wang: '上下级关系',
          },
        },
        {
          id: 'npc_li',
          name: '李医生',
          background: '法医专家，性格孤僻',
          surface_motivation: '追求真相',
          deep_motivation: '弥补过去的错误',
          secrets: ['隐瞒了一份关键验尸报告'],
          initial_relationships: {
            npc_chen: '偶尔合作',
            npc_wang: '不太熟悉',
          },
        },
        {
          id: 'npc_wang',
          name: '王局长',
          background: '新上任的局长，背景复杂',
          surface_motivation: '整顿警局',
          deep_motivation: '为幕后势力服务',
          secrets: ['是辛迪加安插的棋子'],
          initial_relationships: {
            npc_chen: '下属',
            npc_li: '利用关系',
          },
        },
      ],
      tier_b_npcs: [
        {
          id: 'npc_dock_worker',
          name: '码头工人老张',
          background: '发现尸体的目击者',
          role_description: '提供初始线索',
        },
        {
          id: 'npc_bartender',
          name: '酒吧老板娘',
          background: '消息灵通的中间人',
          role_description: '情报来源',
        },
      ],
    },
    initial_locations: [
      {
        id: 'dock',
        name: '码头',
        region_id: 'waterfront',
        description: '繁忙的码头区',
        initial_status: '案发现场被封锁',
        connections: [
          {
            to_location_id: 'police_station',
            traversal_condition: 'OPEN',
            condition_detail: null,
            travel_time_turns: 1,
          },
          {
            to_location_id: 'bar',
            traversal_condition: 'OPEN',
            condition_detail: null,
            travel_time_turns: 1,
          },
        ],
      },
      {
        id: 'police_station',
        name: '警局',
        region_id: 'downtown',
        description: '破旧的市警局',
        initial_status: '正常运作',
        connections: [
          {
            to_location_id: 'dock',
            traversal_condition: 'OPEN',
            condition_detail: null,
            travel_time_turns: 1,
          },
        ],
      },
      {
        id: 'bar',
        name: '酒吧',
        region_id: 'waterfront',
        description: '昏暗的码头酒吧',
        initial_status: '营业中',
        connections: [
          {
            to_location_id: 'dock',
            traversal_condition: 'OPEN',
            condition_detail: null,
            travel_time_turns: 1,
          },
        ],
      },
    ],
  }
}

// ============================================================
// ExtensionConfigLoader
// ============================================================

describe('ExtensionConfigLoader', () => {
  it('loads default config when no overrides', () => {
    const loader = new ExtensionConfigLoader()
    const style = loader.getStyleConfig()
    expect(style.tone).toBe(DEFAULT_STYLE_CONFIG.tone)
    expect(style.complexity).toBe('MEDIUM')
  })

  it('applies style overrides', () => {
    const loader = new ExtensionConfigLoader({
      style: { complexity: 'HIGH', tone: '赛博朋克' },
    })
    const style = loader.getStyleConfig()
    expect(style.complexity).toBe('HIGH')
    expect(style.tone).toBe('赛博朋克')
    // Other defaults preserved
    expect(style.narrative_style).toBe(DEFAULT_STYLE_CONFIG.narrative_style)
  })

  it('returns enabled voices', () => {
    const loader = new ExtensionConfigLoader()
    const voices = loader.getEnabledVoices()
    expect(voices.length).toBe(DEFAULT_COGNITIVE_VOICES.length)
  })

  it('filters disabled voices', () => {
    const customVoices = [
      { voice_id: 'v1', display_name: 'A', description: 'a', enabled: true },
      { voice_id: 'v2', display_name: 'B', description: 'b', enabled: false },
    ]
    const loader = new ExtensionConfigLoader({ voices: customVoices })
    expect(loader.getEnabledVoices()).toHaveLength(1)
    expect(loader.getAllVoices()).toHaveLength(2)
  })

  it('returns default Tier C templates', () => {
    const loader = new ExtensionConfigLoader()
    expect(loader.getTierCTemplates()).toHaveLength(DEFAULT_TIER_C_TEMPLATES.length)
  })

  it('getTemplateByType finds matching template', () => {
    const loader = new ExtensionConfigLoader()
    expect(loader.getTemplateByType('路人')).not.toBeNull()
    expect(loader.getTemplateByType('不存在')).toBeNull()
  })

  it('getNarrativeStyleInjection includes style and tone', () => {
    const loader = new ExtensionConfigLoader()
    const injection = loader.getNarrativeStyleInjection()
    expect(injection).toContain('叙事风格')
    expect(injection).toContain('基调')
  })
})

// ============================================================
// AuthorTooling
// ============================================================

describe('AuthorTooling', () => {
  let loreStore: InMemoryLoreStore

  beforeEach(() => {
    loreStore = new InMemoryLoreStore()
  })

  it('presetLore creates AUTHOR_PRESET entries', async () => {
    const tooling = new AuthorTooling(loreStore)
    await tooling.presetLore([
      {
        content: 'The city was founded 200 years ago',
        fact_type: 'WORLD',
        authority_level: 'AUTHOR_PRESET',
        subject_ids: ['world'],
        source_event_id: null,
      },
    ])

    const entries = await loreStore.findBySubject('world')
    expect(entries).toHaveLength(1)
    expect(entries[0].authority_level).toBe('AUTHOR_PRESET')
    expect(entries[0].causal_chain).toHaveLength(0)
  })
})

// ============================================================
// InitializationAgent
// ============================================================

describe('InitializationAgent', () => {
  let mockLLM: MockLLMProvider
  let runner: AgentRunner
  let stateStore: InMemoryStateStore
  let eventStore: InMemoryEventStore
  let loreStore: InMemoryLoreStore
  let sessionStore: InMemorySessionStore
  let configLoader: ExtensionConfigLoader

  beforeEach(() => {
    mockLLM = new MockLLMProvider()
    runner = new AgentRunner(mockLLM, { timeout_ms: 5000, max_retries: 1, base_delay_ms: 10 })
    stateStore = new InMemoryStateStore()
    eventStore = new InMemoryEventStore()
    loreStore = new InMemoryLoreStore()
    sessionStore = new InMemorySessionStore()
    configLoader = new ExtensionConfigLoader()
  })

  it('initializes from LLM-generated genesis document', async () => {
    const testDoc = makeTestGenesisDoc()
    mockLLM.queueResponse(JSON.stringify(testDoc))

    const agent = new InitializationAgent({
      agentRunner: runner,
      stateStore,
      eventStore,
      sessionStore,
      loreStore,
      configLoader,
    })

    const doc = await agent.initialize()

    // Genesis document persisted
    expect(doc.id).toBe('genesis_test_1')
    const loaded = await sessionStore.loadGenesis('genesis_test_1')
    expect(loaded).not.toBeNull()

    // Lore written
    const worldLore = await loreStore.findBySubject('world')
    expect(worldLore.length).toBeGreaterThan(0)
    expect(worldLore[0].authority_level).toBe('AUTHOR_PRESET')

    // Character states created
    const chenState = await stateStore.get('character:npc_chen:state')
    expect(chenState).not.toBeNull()

    // Locations created
    const dockState = await stateStore.get('location:state:dock')
    expect(dockState).not.toBeNull()

    // Inciting event written
    const events = await eventStore.getAllTier1()
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].title).toBe('神秘命案')

    // Narrative rail setup
    const phases = await stateStore.get('narrative:phases')
    expect(phases).not.toBeNull()
  })

  it('initializeFromExisting reuses genesis document', async () => {
    const testDoc = makeTestGenesisDoc()
    await sessionStore.saveGenesis(testDoc)

    const agent = new InitializationAgent({
      agentRunner: runner,
      stateStore,
      eventStore,
      sessionStore,
      loreStore,
      configLoader,
    })

    const doc = await agent.initializeFromExisting('genesis_test_1')
    expect(doc).not.toBeNull()
    expect(doc!.id).toBe('genesis_test_1')

    // Verify state was distributed
    const chenState = await stateStore.get('character:npc_chen:state')
    expect(chenState).not.toBeNull()
  })

  it('returns null for nonexistent genesis document', async () => {
    const agent = new InitializationAgent({
      agentRunner: runner,
      stateStore,
      eventStore,
      sessionStore,
      loreStore,
      configLoader,
    })

    const doc = await agent.initializeFromExisting('nonexistent')
    expect(doc).toBeNull()
  })
})

// ============================================================
// SaveLoadSystem
// ============================================================

describe('SaveLoadSystem', () => {
  let stateStore: InMemoryStateStore
  let eventStore: InMemoryEventStore
  let sessionStore: InMemorySessionStore
  let longTermMemoryStore: InMemoryLongTermMemoryStore
  let injectionMgr: InMemoryInjectionQueueManager
  let saveLoad: SaveLoadSystem

  beforeEach(() => {
    stateStore = new InMemoryStateStore()
    eventStore = new InMemoryEventStore()
    sessionStore = new InMemorySessionStore()
    longTermMemoryStore = new InMemoryLongTermMemoryStore()
    injectionMgr = new InMemoryInjectionQueueManager()
    saveLoad = new SaveLoadSystem(
      stateStore,
      eventStore,
      sessionStore,
      longTermMemoryStore,
      injectionMgr,
    )
  })

  it('save and load round-trip preserves state', async () => {
    // Setup some state
    const testDoc = makeTestGenesisDoc()
    await sessionStore.saveGenesis(testDoc)
    await stateStore.set('location:state:dock', { id: 'dock', name: '码头' })
    await stateStore.set('character:npc_chen:state', {
      npc_id: 'npc_chen', tier: 'A', current_emotion: 'suspicious',
      current_location_id: 'dock', interaction_count: 5, is_active: false, goal_queue: [],
    })
    await stateStore.set('player:traits:sarcastic', {
      trait_id: 'sarcastic', trait_type: 'EXPRESSION', current_weight: 0.6, last_updated_turn: 3,
    })

    // Add injection
    injectionMgr.enqueueReflection({
      id: 'r1', voice_id: 'logic', content: 'Think carefully',
      priority: 'HIGH', expiry_turns: 5, created_at_turn: 3,
    })

    // Save
    const saveId = await saveLoad.save('genesis_test_1', 10)
    expect(saveId).toBeTruthy()

    // Clear state
    const freshStateStore = new InMemoryStateStore()
    const freshInjMgr = new InMemoryInjectionQueueManager()
    const freshSaveLoad = new SaveLoadSystem(
      freshStateStore,
      eventStore,
      sessionStore,
      longTermMemoryStore,
      freshInjMgr,
    )

    // Load
    const result = await freshSaveLoad.load(saveId)
    expect(result).not.toBeNull()
    expect(result!.turn).toBe(10)
    expect(result!.genesisDoc.id).toBe('genesis_test_1')

    // Verify state restored
    const chenState = await freshStateStore.get<{ npc_id: string }>('character:npc_chen:state')
    expect(chenState?.npc_id).toBe('npc_chen')

    const traitWeight = await freshStateStore.get<{ current_weight: number }>('player:traits:sarcastic')
    expect(traitWeight?.current_weight).toBe(0.6)

    // Verify injection restored
    const reflection = freshInjMgr.dequeueReflection()
    expect(reflection).not.toBeNull()
    expect(reflection!.content).toBe('Think carefully')
  })

  it('load returns null for nonexistent save', async () => {
    const result = await saveLoad.load('nonexistent')
    expect(result).toBeNull()
  })

  it('listSaves returns save IDs for genesis doc', async () => {
    const testDoc = makeTestGenesisDoc()
    await sessionStore.saveGenesis(testDoc)
    await stateStore.set('location:state:dock', { id: 'dock' })

    const id1 = await saveLoad.save('genesis_test_1', 5)
    const id2 = await saveLoad.save('genesis_test_1', 10)

    const saves = await saveLoad.listSaves('genesis_test_1')
    expect(saves).toContain(id1)
    expect(saves).toContain(id2)
  })

  it('crash recovery detects consistent state', async () => {
    const result = await saveLoad.checkAndRecoverConsistency()
    expect(result.recovered).toBe(false)
  })
})

// ============================================================
// End-to-End Integration Scenario A: Full Lifecycle
// ============================================================

describe('E2E: Full Lifecycle', () => {
  it('initializes, saves, loads, and continues', async () => {
    const mockLLM = new MockLLMProvider()
    const runner = new AgentRunner(mockLLM, { timeout_ms: 5000, max_retries: 1, base_delay_ms: 10 })
    const stateStore = new InMemoryStateStore()
    const eventStore = new InMemoryEventStore()
    const loreStore = new InMemoryLoreStore()
    const sessionStore = new InMemorySessionStore()
    const longTermMemoryStore = new InMemoryLongTermMemoryStore()
    const injectionMgr = new InMemoryInjectionQueueManager()
    const configLoader = new ExtensionConfigLoader()

    // Step 1: Initialize
    const testDoc = makeTestGenesisDoc()
    mockLLM.queueResponse(JSON.stringify(testDoc))

    const initAgent = new InitializationAgent({
      agentRunner: runner,
      stateStore,
      eventStore,
      sessionStore,
      loreStore,
      configLoader,
    })

    const genesisDoc = await initAgent.initialize()
    expect(genesisDoc.id).toBe('genesis_test_1')

    // Verify inciting event
    const events = await eventStore.getAllTier1()
    expect(events.length).toBe(1)
    expect(events[0].weight).toBe('MAJOR')

    // Verify NPC states
    for (const npc of testDoc.characters.tier_a_npcs) {
      const state = await stateStore.get(`character:${npc.id}:state`)
      expect(state).not.toBeNull()
    }

    // Step 2: Save
    const saveLoad = new SaveLoadSystem(
      stateStore,
      eventStore,
      sessionStore,
      longTermMemoryStore,
      injectionMgr,
    )
    const saveId = await saveLoad.save('genesis_test_1', 0)

    // Step 3: Load into fresh stores
    const freshState = new InMemoryStateStore()
    const freshInjMgr = new InMemoryInjectionQueueManager()
    const freshSaveLoad = new SaveLoadSystem(
      freshState,
      eventStore,
      sessionStore,
      longTermMemoryStore,
      freshInjMgr,
    )

    const loadResult = await freshSaveLoad.load(saveId)
    expect(loadResult).not.toBeNull()

    // Verify loaded state
    const loadedChen = await freshState.get<{ npc_id: string }>('character:npc_chen:state')
    expect(loadedChen?.npc_id).toBe('npc_chen')
  })
})

// ============================================================
// E2E: NPC Tier Upgrade
// ============================================================

describe('E2E: NPC Tier Upgrade', () => {
  it('Tier C NPC upgrades to B after 3 interactions', async () => {
    const stateStore = new InMemoryStateStore()
    // Import dynamically to avoid circular deps in test
    const { NPCTierManager } = await import('./npc-tier-manager.js')

    // Setup Tier C NPC
    await stateStore.set('character:npc_vendor:state', {
      npc_id: 'npc_vendor',
      tier: 'C',
      current_emotion: 'neutral',
      current_location_id: 'market',
      interaction_count: 0,
      is_active: false,
      goal_queue: [],
    })

    const tierManager = new NPCTierManager(stateStore)

    // Simulate 3 interactions — increment interaction_count on state
    const npcState = await stateStore.get<Record<string, unknown>>('character:npc_vendor:state')
    await stateStore.set('character:npc_vendor:state', { ...npcState, interaction_count: 3 })

    // Check upgrade
    await tierManager.checkUpgrade('npc_vendor')

    const updatedState = await stateStore.get<{ tier: string }>('character:npc_vendor:state')
    expect(updatedState?.tier).toBe('B')

    // Verify memory buffer created
    const buffer = await stateStore.get<{ max_size: number }>('character:npc_vendor:memory_buffer')
    expect(buffer).not.toBeNull()
    expect(buffer!.max_size).toBe(5)
  })
})

// ============================================================
// E2E: Lore Canonicalization
// ============================================================

describe('E2E: Lore Canonicalization', () => {
  it('extracts and canonicalizes facts, rejects contradictions with AUTHOR_PRESET', async () => {
    const mockLLM = new MockLLMProvider()
    const runner = new AgentRunner(mockLLM, { timeout_ms: 5000, max_retries: 1, base_delay_ms: 10 })
    const loreStore = new InMemoryLoreStore()
    const stateStore = new InMemoryStateStore()
    const { LoreCanonicalizer } = await import('./lore-canonicalizer.js')

    const canonicalizer = new LoreCanonicalizer(runner, loreStore, stateStore)

    // Pre-seed AUTHOR_PRESET lore
    await loreStore.append({
      id: 'preset_1',
      content: '陈督察今年45岁',
      fact_type: 'NPC_PERSONAL',
      authority_level: 'AUTHOR_PRESET',
      subject_ids: ['npc_chen'],
      source_event_id: null,
      created_at_turn: 0,
      causal_chain: [],
      related_lore_ids: [],
      content_hash: 'preset_hash_1',
    })

    // Scenario: NPC mentions a new fact (supplementary)
    mockLLM.queueResponse(JSON.stringify({
      facts: [
        {
          content: '陈督察曾在北区工作过',
          fact_type: 'NPC_PERSONAL',
          subject_ids: ['npc_chen'],
          confidence: 0.9,
        },
      ],
    }))
    mockLLM.queueResponse(JSON.stringify({
      verdict: 'SUPPLEMENTARY',
      reasoning: 'New information about work history',
    }))

    const entries1 = await canonicalizer.canonicalize('narrative text 1', 'evt_1', 5)
    expect(entries1).toHaveLength(1)
    expect(entries1[0].authority_level).toBe('AI_CANONICALIZED')

    // Scenario: Another NPC says contradictory fact vs AUTHOR_PRESET
    mockLLM.queueResponse(JSON.stringify({
      facts: [
        {
          content: '陈督察今年50岁',
          fact_type: 'NPC_PERSONAL',
          subject_ids: ['npc_chen'],
          confidence: 0.85,
        },
      ],
    }))
    mockLLM.queueResponse(JSON.stringify({
      verdict: 'CONTRADICTORY',
      reasoning: 'Age conflict with preset',
    }))

    const entries2 = await canonicalizer.canonicalize('narrative text 2', 'evt_2', 6)
    expect(entries2).toHaveLength(0) // Rejected because of AUTHOR_PRESET
  })
})
