import type { ILoreStore } from '../../infrastructure/storage/interfaces.js'
import type { LoreEntry } from '../models/lore.js'
import type { TierCTemplate } from '../models/character.js'
import type { TraitConfig } from '../models/trait.js'

// ============================================================
// Style Config
// ============================================================

export interface StyleConfig {
  tone: string
  complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  narrative_style: string
  player_archetype: string
}

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  tone: '黑色政治惊悚，充满阴谋与道德灰色地带',
  complexity: 'MEDIUM',
  narrative_style: '写实风格，注重心理描写和环境氛围',
  player_archetype: '身陷权力漩涡的调查者',
}

// ============================================================
// Cognitive Voice Config
// ============================================================

export interface CognitiveVoiceConfig {
  voice_id: string
  display_name: string
  description: string
  enabled: boolean
}

export const DEFAULT_COGNITIVE_VOICES: CognitiveVoiceConfig[] = [
  { voice_id: 'logic', display_name: '逻辑', description: '冷静分析，寻找矛盾', enabled: true },
  { voice_id: 'empathy', display_name: '同理心', description: '感受他人情绪', enabled: true },
  { voice_id: 'instinct', display_name: '直觉', description: '凭直觉判断', enabled: true },
  { voice_id: 'authority', display_name: '权威', description: '引用规则和制度', enabled: true },
]

// ============================================================
// Default Trait Configs (personality inner voices)
// ============================================================

export const DEFAULT_TRAIT_CONFIGS: TraitConfig[] = [
  {
    trait_id: 'logic',
    trait_type: 'VALUE',
    display_name: '逻辑',
    voice_description: '冷静分析，善于发现矛盾和漏洞，追求理性判断',
    threshold_active: 0.4,
    threshold_silent: 0.1,
    hysteresis_band: 0.05,
    decay_rate: 0.95,
    signal_mapping: { analytical: 1.0, cautious: 0.5, aggressive: -0.3 },
  },
  {
    trait_id: 'empathy',
    trait_type: 'VALUE',
    display_name: '同理心',
    voice_description: '感受他人的情绪和处境，关注行为对他人的影响',
    threshold_active: 0.4,
    threshold_silent: 0.1,
    hysteresis_band: 0.05,
    decay_rate: 0.95,
    signal_mapping: { compassionate: 1.0, diplomatic: 0.5, aggressive: -0.5 },
  },
  {
    trait_id: 'instinct',
    trait_type: 'EXPRESSION',
    display_name: '直觉',
    voice_description: '凭直觉判断，警觉危险信号，预感事态发展',
    threshold_active: 0.4,
    threshold_silent: 0.1,
    hysteresis_band: 0.05,
    decay_rate: 0.9,
    signal_mapping: { cautious: 0.8, aggressive: 0.3, analytical: -0.2 },
  },
  {
    trait_id: 'authority',
    trait_type: 'VALUE',
    display_name: '权威',
    voice_description: '引用规则、制度和权力结构，强调秩序与责任',
    threshold_active: 0.4,
    threshold_silent: 0.1,
    hysteresis_band: 0.05,
    decay_rate: 0.95,
    signal_mapping: { authoritative: 1.0, diplomatic: 0.3, rebellious: -0.5 },
  },
]

// ============================================================
// Default Tier C Templates
// ============================================================

export const DEFAULT_TIER_C_TEMPLATES: TierCTemplate[] = [
  {
    template_id: 'passerby',
    type: '路人',
    personality_sketch: '普通市民，对周围发生的事有些好奇但不想卷入',
    default_response_style: '简短、有些警惕',
  },
  {
    template_id: 'vendor',
    type: '小贩',
    personality_sketch: '精明的商人，关心生意多过一切',
    default_response_style: '热情但有所保留',
  },
  {
    template_id: 'guard',
    type: '守卫',
    personality_sketch: '尽职尽责，按规办事',
    default_response_style: '公事公办，语气生硬',
  },
]

// ============================================================
// Extension Config Loader
// ============================================================

export class ExtensionConfigLoader {
  private styleConfig: StyleConfig
  private cognitiveVoices: CognitiveVoiceConfig[]
  private tierCTemplates: TierCTemplate[]
  private traitConfigs: TraitConfig[]

  constructor(overrides?: {
    style?: Partial<StyleConfig>
    voices?: CognitiveVoiceConfig[]
    templates?: TierCTemplate[]
    traits?: TraitConfig[]
  }) {
    this.styleConfig = { ...DEFAULT_STYLE_CONFIG, ...overrides?.style }
    this.cognitiveVoices = overrides?.voices ?? [...DEFAULT_COGNITIVE_VOICES]
    this.tierCTemplates = overrides?.templates ?? [...DEFAULT_TIER_C_TEMPLATES]
    this.traitConfigs = overrides?.traits ?? [...DEFAULT_TRAIT_CONFIGS]
  }

  getStyleConfig(): StyleConfig {
    return { ...this.styleConfig }
  }

  getEnabledVoices(): CognitiveVoiceConfig[] {
    return this.cognitiveVoices.filter((v) => v.enabled)
  }

  getAllVoices(): CognitiveVoiceConfig[] {
    return [...this.cognitiveVoices]
  }

  getTierCTemplates(): TierCTemplate[] {
    return [...this.tierCTemplates]
  }

  getTraitConfigs(): TraitConfig[] {
    return [...this.traitConfigs]
  }

  getTemplateByType(type: string): TierCTemplate | null {
    return this.tierCTemplates.find((t) => t.type === type) ?? null
  }

  getRandomTemplate(): TierCTemplate {
    const idx = Math.floor(Math.random() * this.tierCTemplates.length)
    return this.tierCTemplates[idx]
  }

  /** Build narrative style injection for prompt [WORLD_CONTEXT] zones */
  getNarrativeStyleInjection(): string {
    return `叙事风格：${this.styleConfig.narrative_style}\n基调：${this.styleConfig.tone}`
  }
}

// ============================================================
// Author Tooling Interface
// ============================================================

export interface IAuthorTooling {
  presetLore(entries: Omit<LoreEntry, 'id' | 'content_hash' | 'causal_chain' | 'related_lore_ids' | 'created_at_turn'>[]): Promise<void>
  listCanonicalizedLore(): Promise<LoreEntry[]>
}

export class AuthorTooling implements IAuthorTooling {
  constructor(private loreStore: ILoreStore) {}

  async presetLore(
    entries: Omit<LoreEntry, 'id' | 'content_hash' | 'causal_chain' | 'related_lore_ids' | 'created_at_turn'>[],
  ): Promise<void> {
    for (const entry of entries) {
      const fullEntry: LoreEntry = {
        ...entry,
        id: crypto.randomUUID(),
        content_hash: this.simpleHash(entry.content),
        causal_chain: [],
        related_lore_ids: [],
        created_at_turn: 0,
      }
      await this.loreStore.append(fullEntry)
    }
  }

  async listCanonicalizedLore(): Promise<LoreEntry[]> {
    return this.loreStore.findByFactType('NPC_PERSONAL')
  }

  private simpleHash(str: string): string {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
  }
}
