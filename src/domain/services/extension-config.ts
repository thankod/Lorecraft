import type { ILoreStore } from '../../infrastructure/storage/interfaces.js'
import type { LoreEntry } from '../models/lore.js'
import type { TierCTemplate } from '../models/character.js'
import type { TraitConfig } from '../models/trait.js'
import { uuid } from '../../utils/uuid.js'
import type { PlayerProfileInput } from '../models/player-profile.js'
import type { ResolvedWorldBrief } from '../models/world-creation.js'
import {
  STORY_DRIVERS,
  type StoryDriver,
  type StoryPressure,
} from '../models/story.js'

export { STORY_DRIVERS }
export type { StoryDriver, StoryPressure }

// ============================================================
// Style Config
// ============================================================

export type NarrativeGuidanceMode = 'OPEN' | 'SUPPORTIVE' | 'DIRECTED'

export interface StyleConfig {
  tone: string
  complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  narrative_style: string
  player_archetype: string
  story_drivers: StoryDriver[]
  story_pressure: StoryPressure
  player_profile?: PlayerProfileInput
  world_brief?: ResolvedWorldBrief
}

export function deriveNarrativeGuidanceMode(
  pressure: StoryPressure,
): NarrativeGuidanceMode {
  if (pressure === 'CALM') return 'OPEN'
  if (pressure === 'GENTLE') return 'SUPPORTIVE'
  return 'DIRECTED'
}

/** Preset with display metadata */
export interface StylePreset extends StyleConfig {
  id: string
  label: string
  description: string
}

// ── Style Presets ──

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cozy_town',
    label: '小镇日常',
    description: '熟悉街巷里的邻里、四季与细碎愿望',
    tone: '温暖克制的小镇日常，关注邻里关系、四季变化与普通人的细碎愿望',
    complexity: 'LOW',
    narrative_style: '自然舒缓，重视生活细节、对话余韵与空间氛围',
    player_archetype: '',
    story_drivers: ['RELATIONSHIP', 'EXPLORATION'],
    story_pressure: 'CALM',
  },
  {
    id: 'culinary_life',
    label: '料理生活',
    description: '围绕食物、手艺与相遇展开的生活故事',
    tone: '以料理和日常经营为中心的生活故事，温和、具体，允许失败与慢慢成长',
    complexity: 'LOW',
    narrative_style: '细腻描写食物、劳动与人情，不制造无端危机',
    player_archetype: '',
    story_drivers: ['GROWTH', 'RELATIONSHIP'],
    story_pressure: 'CALM',
  },
  {
    id: 'road_journey',
    label: '公路旅行',
    description: '在移动、风景和偶然同行中认识世界',
    tone: '舒展的公路旅行，在移动、陌生风景和短暂相遇中理解自己与他人',
    complexity: 'LOW',
    narrative_style: '带有旅行随笔质感，场景鲜明，对话松弛，节奏有停顿',
    player_archetype: '',
    story_drivers: ['EXPLORATION', 'GROWTH'],
    story_pressure: 'GENTLE',
  },
  {
    id: 'family_chronicle',
    label: '家庭纪事',
    description: '围绕共同生活、旧物与代际关系的故事',
    tone: '贴近日常的家庭纪事，关注共同生活、旧物记忆与代际关系，不预设对立',
    complexity: 'MEDIUM',
    narrative_style: '平实含蓄，通过动作、物件和未说出口的话表现关系变化',
    player_archetype: '',
    story_drivers: ['RELATIONSHIP', 'GROWTH'],
    story_pressure: 'GENTLE',
  },
  {
    id: 'noir_political_thriller',
    label: '黑色政治惊悚',
    description: '阴谋、权力与道德灰色地带',
    tone: '黑色政治惊悚，充满阴谋与道德灰色地带',
    complexity: 'MEDIUM',
    narrative_style: '写实风格，注重心理描写和环境氛围',
    player_archetype: '',
    story_drivers: ['MYSTERY', 'RELATIONSHIP'],
    story_pressure: 'INTENSE',
  },
  {
    id: 'gothic_horror',
    label: '哥特恐怖',
    description: '维多利亚庄园与超自然秘密',
    tone: '哥特恐怖，维多利亚时代的阴郁庄园与超自然秘密',
    complexity: 'MEDIUM',
    narrative_style: '古典文学风格，辞藻华丽，气氛压抑，善用暗示与隐喻',
    player_archetype: '',
    story_drivers: ['MYSTERY', 'EXPLORATION'],
    story_pressure: 'ACTIVE',
  },
  {
    id: 'western',
    label: '西部荒野',
    description: '法外之地的暴力与荣耀',
    tone: '西部荒野，法外之地的暴力与荣耀，灰尘与鲜血',
    complexity: 'LOW',
    narrative_style: '粗犷硬朗，对白简练有力，注重动作场面与道德抉择',
    player_archetype: '',
    story_drivers: ['EXPLORATION', 'SURVIVAL'],
    story_pressure: 'ACTIVE',
  },
  {
    id: 'fantasy_epic',
    label: '奇幻史诗',
    description: '古老预言与远古之恶',
    tone: '奇幻史诗，古老预言、种族纷争与即将苏醒的远古之恶',
    complexity: 'HIGH',
    narrative_style: '史诗叙事，宏大而细腻，融合战争场面与个人命运',
    player_archetype: '',
    story_drivers: ['EXPLORATION', 'GROWTH'],
    story_pressure: 'INTENSE',
  },
  {
    id: 'wuxia',
    label: '江湖武侠',
    description: '刀光剑影下的恩怨情仇',
    tone: '江湖武侠，庙堂与江湖交织，刀光剑影下的恩怨情仇',
    complexity: 'MEDIUM',
    narrative_style: '古典武侠风格，意境深远，打斗写意，重义轻利',
    player_archetype: '',
    story_drivers: ['RELATIONSHIP', 'GROWTH'],
    story_pressure: 'ACTIVE',
  },
  {
    id: 'post_apocalypse',
    label: '末日废土',
    description: '文明崩塌后的荒原求生',
    tone: '末日废土，文明崩塌后的荒原求生，资源争夺与人性考验',
    complexity: 'LOW',
    narrative_style: '冷峻克制，环境描写粗粝真实，对话务实简短',
    player_archetype: '',
    story_drivers: ['SURVIVAL', 'EXPLORATION'],
    story_pressure: 'INTENSE',
  },
  {
    id: 'space_opera',
    label: '太空歌剧',
    description: '星际殖民时代的政治与探索',
    tone: '太空歌剧，星际殖民时代的政治博弈、异星探索与文明冲突',
    complexity: 'HIGH',
    narrative_style: '科幻风格，兼具硬科幻的严谨与太空歌剧的浪漫，注重异星文化描写',
    player_archetype: '',
    story_drivers: ['EXPLORATION', 'RELATIONSHIP'],
    story_pressure: 'ACTIVE',
  },
  {
    id: 'urban_mystery',
    label: '都市悬疑',
    description: '现代城市中的离奇案件与隐藏真相',
    tone: '现代都市悬疑，日常生活表面下的暗流涌动与人心险恶',
    complexity: 'MEDIUM',
    narrative_style: '贴近现实的叙事，节奏紧凑，注重线索铺设与逻辑推理',
    player_archetype: '',
    story_drivers: ['MYSTERY', 'RELATIONSHIP'],
    story_pressure: 'ACTIVE',
  },
  {
    id: 'campus_youth',
    label: '校园青春',
    description: '校园生活中的友情、成长与秘密',
    tone: '校园青春，平凡高中生活中的友情、暗恋、竞争与成长',
    complexity: 'LOW',
    narrative_style: '清新细腻，对话生动自然，注重人物关系与情感变化',
    player_archetype: '',
    story_drivers: ['RELATIONSHIP', 'GROWTH'],
    story_pressure: 'CALM',
  },
  {
    id: 'rural_supernatural',
    label: '乡村志怪',
    description: '偏远村落的民间传说与诡异事件',
    tone: '乡村志怪，偏远村落中口耳相传的禁忌与无法解释的现象',
    complexity: 'MEDIUM',
    narrative_style: '带有民俗色彩的叙事，方言点缀，气氛从日常渐入诡异',
    player_archetype: '',
    story_drivers: ['MYSTERY', 'RELATIONSHIP'],
    story_pressure: 'GENTLE',
  },
  {
    id: 'corporate',
    label: '职场风云',
    description: '商业帝国中的权谋与抉择',
    tone: '职场商战，表面光鲜的写字楼里暗藏利益博弈与人性考验',
    complexity: 'MEDIUM',
    narrative_style: '现代商业叙事，对白犀利，节奏明快，注重策略与心理博弈',
    player_archetype: '',
    story_drivers: ['GROWTH', 'RELATIONSHIP'],
    story_pressure: 'ACTIVE',
  },
  {
    id: 'republic_espionage',
    label: '民国谍影',
    description: '乱世中的多方暗战与信仰抉择',
    tone: '民国谍战，新旧交替的时代洪流中各方势力的暗中角力',
    complexity: 'HIGH',
    narrative_style: '年代感厚重的叙事，融合历史细节与悬疑张力，人物命运与时代交织',
    player_archetype: '',
    story_drivers: ['MYSTERY', 'RELATIONSHIP'],
    story_pressure: 'INTENSE',
  },
]

export function randomStylePreset(): StylePreset {
  return STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)]
}

export const DEFAULT_STYLE_CONFIG: StyleConfig = STYLE_PRESETS.find(
  (preset) => preset.id === 'noir_political_thriller',
)!

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
        id: uuid(),
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
