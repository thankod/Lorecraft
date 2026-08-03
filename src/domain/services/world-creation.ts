import type {
  CivilizationStage,
  PrimaryStage,
  QuickWorldArchetype,
  ResolvedWorldBrief,
  SocialForm,
  StoryMood,
  StoryTheme,
  SupernaturalBoundary,
  TechnologyLevel,
  WorldBuilderConfig,
  WorldCreationDraft,
  WorldPresetDefinition,
  WorldTradition,
} from '../models/world-creation.js'
import {
  CIVILIZATION_STAGES,
  PRIMARY_STAGES,
  QUICK_WORLD_ARCHETYPES,
  ResolvedWorldBriefSchema,
  SOCIAL_FORMS,
  STORY_MOODS,
  STORY_THEMES,
  SUPERNATURAL_BOUNDARIES,
  TECHNOLOGY_LEVELS,
  WORLD_TRADITIONS,
  WorldCreationDraftSchema,
} from '../models/world-creation.js'
import type { StoryDriver, StoryPressure } from '../models/story.js'
import type { StyleConfig } from './extension-config.js'

type ResolvedFieldDefaults = {
  civilization_stage: Exclude<CivilizationStage, 'AUTO'>
  world_tradition: Exclude<WorldTradition, 'AUTO'>
  primary_stage: Exclude<PrimaryStage, 'AUTO'>
  social_form: Exclude<SocialForm, 'AUTO'>
  technology_level: Exclude<TechnologyLevel, 'AUTO'>
  supernatural_boundary: Exclude<SupernaturalBoundary, 'AUTO'>
  mood: Exclude<StoryMood, 'AUTO'>
}

export const QUICK_ARCHETYPE_DEFAULTS: Record<QuickWorldArchetype, ResolvedFieldDefaults> = {
  MODERN: {
    civilization_stage: 'MODERN',
    world_tradition: 'REALISTIC',
    primary_stage: 'METROPOLIS',
    social_form: 'COMMUNITY',
    technology_level: 'MODERN',
    supernatural_boundary: 'NONE',
    mood: 'BRIGHT',
  },
  HISTORICAL: {
    civilization_stage: 'CLASSICAL',
    world_tradition: 'HISTORICAL',
    primary_stage: 'COURT',
    social_form: 'EMPIRE',
    technology_level: 'HANDCRAFT',
    supernatural_boundary: 'NONE',
    mood: 'QUIET',
  },
  WESTERN_FANTASY: {
    civilization_stage: 'CLASSICAL',
    world_tradition: 'WESTERN_FANTASY',
    primary_stage: 'FRONTIER',
    social_form: 'CITY_STATES',
    technology_level: 'HANDCRAFT',
    supernatural_boundary: 'PUBLIC',
    mood: 'BRIGHT',
  },
  WUXIA: {
    civilization_stage: 'CLASSICAL',
    world_tradition: 'WUXIA',
    primary_stage: 'SECT',
    social_form: 'SECTS',
    technology_level: 'HANDCRAFT',
    supernatural_boundary: 'RUMORED',
    mood: 'QUIET',
  },
  SCI_FI: {
    civilization_stage: 'INTERSTELLAR',
    world_tradition: 'SCI_FI',
    primary_stage: 'STATION_COLONY',
    social_form: 'CORPORATIONS',
    technology_level: 'ADVANCED',
    supernatural_boundary: 'NONE',
    mood: 'COLD',
  },
  POST_APOCALYPSE: {
    civilization_stage: 'POST_COLLAPSE',
    world_tradition: 'SCI_FI',
    primary_stage: 'ISOLATED_SETTLEMENT',
    social_form: 'DECENTRALIZED',
    technology_level: 'MIXED',
    supernatural_boundary: 'RUMORED',
    mood: 'DESOLATE',
  },
}

export function createEmptyWorldDraft(): WorldCreationDraft {
  return {
    schema_version: 1,
    base_archetype: null,
    source_preset_id: null,
    civilization_stage: 'AUTO',
    world_tradition: 'AUTO',
    primary_stage: 'AUTO',
    social_form: 'AUTO',
    technology_level: 'AUTO',
    supernatural_boundary: 'AUTO',
    primary_theme: null,
    secondary_theme: null,
    mood: 'AUTO',
    custom_requirements: '',
    excluded_content: '',
  }
}

function createPreset(
  id: string,
  label: string,
  description: string,
  values: Partial<WorldCreationDraft> & Pick<WorldCreationDraft, 'base_archetype' | 'primary_theme'>,
): WorldPresetDefinition {
  return {
    id,
    label,
    description,
    draft: WorldCreationDraftSchema.parse({
      ...createEmptyWorldDraft(),
      ...values,
      source_preset_id: id,
    }),
  }
}

export const WORLD_PRESETS: WorldPresetDefinition[] = [
  createPreset('modern_city', '现代都市', '城市生活、人际关系与个人成长', {
    base_archetype: 'MODERN',
    primary_theme: 'RELATIONSHIP',
    secondary_theme: 'GROWTH',
    mood: 'BRIGHT',
  }),
  createPreset('campus_youth', '校园青春', '校园里的友情、成长与朦胧心事', {
    base_archetype: 'MODERN',
    primary_stage: 'ACADEMY',
    primary_theme: 'GROWTH',
    secondary_theme: 'RELATIONSHIP',
    mood: 'WARM',
  }),
  createPreset('cozy_town', '温馨小镇', '邻里、四季和慢慢展开的生活', {
    base_archetype: 'MODERN',
    primary_stage: 'SMALL_TOWN',
    social_form: 'COMMUNITY',
    primary_theme: 'DAILY',
    secondary_theme: 'RELATIONSHIP',
    mood: 'WARM',
  }),
  createPreset('urban_mystery', '都市悬疑', '熟悉城市表面下的谜团与秘密', {
    base_archetype: 'MODERN',
    primary_theme: 'MYSTERY',
    secondary_theme: 'RELATIONSHIP',
    mood: 'COLD',
  }),
  createPreset('ancient_life', '古代生活', '古城烟火、家业人情与日常选择', {
    base_archetype: 'HISTORICAL',
    primary_stage: 'SMALL_TOWN',
    social_form: 'CLANS',
    primary_theme: 'DAILY',
    secondary_theme: 'GROWTH',
    mood: 'WARM',
  }),
  createPreset('wuxia', '江湖武侠', '门派、游历、情义与自我磨砺', {
    base_archetype: 'WUXIA',
    primary_stage: 'JOURNEY',
    primary_theme: 'ADVENTURE',
    secondary_theme: 'GROWTH',
    mood: 'BRIGHT',
  }),
  createPreset('court_politics', '宫廷权谋', '朝堂、家国和层层交错的关系', {
    base_archetype: 'HISTORICAL',
    primary_stage: 'COURT',
    social_form: 'EMPIRE',
    primary_theme: 'POLITICS',
    secondary_theme: 'MYSTERY',
    mood: 'SOMBER',
  }),
  createPreset('western_fantasy', '西方奇幻', '魔法、城邦与未知边疆的冒险', {
    base_archetype: 'WESTERN_FANTASY',
    primary_theme: 'ADVENTURE',
    secondary_theme: 'MYSTERY',
    mood: 'BRIGHT',
  }),
  createPreset('space_scifi', '太空科幻', '星际聚落、技术边界与远方探索', {
    base_archetype: 'SCI_FI',
    primary_theme: 'ADVENTURE',
    secondary_theme: 'POLITICS',
    mood: 'COLD',
  }),
  createPreset('post_apocalypse', '末日废土', '文明余烬中的生存、同行与重建', {
    base_archetype: 'POST_APOCALYPSE',
    primary_theme: 'SURVIVAL',
    secondary_theme: 'RELATIONSHIP',
    mood: 'DESOLATE',
  }),
]

export const WORLD_BUILDER_CONFIG: WorldBuilderConfig = {
  schema_version: 1,
  presets: WORLD_PRESETS,
  catalogs: {
    quick_archetypes: QUICK_WORLD_ARCHETYPES,
    civilization_stages: CIVILIZATION_STAGES,
    world_traditions: WORLD_TRADITIONS,
    primary_stages: PRIMARY_STAGES,
    social_forms: SOCIAL_FORMS,
    technology_levels: TECHNOLOGY_LEVELS,
    supernatural_boundaries: SUPERNATURAL_BOUNDARIES,
    themes: STORY_THEMES,
    moods: STORY_MOODS,
  },
}

export function applyQuickWorldArchetype(
  draft: WorldCreationDraft,
  archetype: QuickWorldArchetype,
): WorldCreationDraft {
  const defaults = QUICK_ARCHETYPE_DEFAULTS[archetype]
  return {
    ...draft,
    base_archetype: archetype,
    source_preset_id: null,
    civilization_stage: defaults.civilization_stage,
    world_tradition: defaults.world_tradition,
    primary_stage: defaults.primary_stage,
    social_form: defaults.social_form,
    technology_level: defaults.technology_level,
    supernatural_boundary: defaults.supernatural_boundary,
  }
}

export function applyWorldPreset(
  draft: WorldCreationDraft,
  preset: WorldPresetDefinition,
): WorldCreationDraft {
  return {
    ...preset.draft,
    excluded_content: draft.excluded_content,
  }
}

const PRESET_COMPARISON_FIELDS: Array<keyof WorldCreationDraft> = [
  'base_archetype',
  'civilization_stage',
  'world_tradition',
  'primary_stage',
  'social_form',
  'technology_level',
  'supernatural_boundary',
  'primary_theme',
  'secondary_theme',
  'mood',
  'custom_requirements',
]

export function isDraftBasedOnPreset(
  draft: WorldCreationDraft,
  preset: WorldPresetDefinition,
): boolean {
  return PRESET_COMPARISON_FIELDS.every((field) => draft[field] === preset.draft[field])
}

const THEME_GUIDANCE: Record<StoryTheme, ResolvedWorldBrief['guidance']> = {
  DAILY: { mode: 'OPEN', pressure: 'CALM', event_sources: ['ROUTINE', 'CRAFT', 'COMMUNITY'] },
  RELATIONSHIP: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['RELATIONSHIPS', 'CHOICES', 'CHANGE'] },
  GROWTH: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['PRACTICE', 'CHOICES', 'CONSEQUENCES'] },
  ADVENTURE: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['DISCOVERY', 'TRAVEL', 'OBSTACLES'] },
  MYSTERY: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['CLUES', 'SECRETS', 'REVELATIONS'] },
  SURVIVAL: { mode: 'DIRECTED', pressure: 'INTENSE', event_sources: ['SCARCITY', 'ENVIRONMENT', 'HARD_CHOICES'] },
  POLITICS: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['FACTIONS', 'NEGOTIATION', 'CONSEQUENCES'] },
  FOLKLORE: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['CUSTOMS', 'RUMORS', 'UNCANNY_ENCOUNTERS'] },
}

export function resolveWorldCreationDraft(input: WorldCreationDraft): ResolvedWorldBrief {
  const draft = WorldCreationDraftSchema.parse(input)
  const archetype = draft.base_archetype
  if (!archetype || !draft.primary_theme) {
    throw new Error('World draft must include an archetype and primary theme')
  }
  const defaults = QUICK_ARCHETYPE_DEFAULTS[archetype]
  const resolve = <T extends string>(value: T | 'AUTO', fallback: T): T => (
    value === 'AUTO' ? fallback : value
  )
  const themes = [draft.primary_theme]
  if (draft.secondary_theme) themes.push(draft.secondary_theme)

  return ResolvedWorldBriefSchema.parse({
    schema_version: 1,
    civilization_stage: resolve(draft.civilization_stage, defaults.civilization_stage),
    world_tradition: resolve(draft.world_tradition, defaults.world_tradition),
    primary_stage: resolve(draft.primary_stage, defaults.primary_stage),
    social_form: resolve(draft.social_form, defaults.social_form),
    technology_level: resolve(draft.technology_level, defaults.technology_level),
    supernatural_boundary: resolve(draft.supernatural_boundary, defaults.supernatural_boundary),
    themes,
    mood: resolve(draft.mood, defaults.mood),
    custom_requirements: draft.custom_requirements,
    excluded_content: draft.excluded_content,
    guidance: THEME_GUIDANCE[draft.primary_theme],
  })
}

const THEME_TO_DRIVERS: Record<StoryTheme, StoryDriver[]> = {
  DAILY: ['RELATIONSHIP', 'GROWTH'],
  RELATIONSHIP: ['RELATIONSHIP'],
  GROWTH: ['GROWTH'],
  ADVENTURE: ['EXPLORATION'],
  MYSTERY: ['MYSTERY'],
  SURVIVAL: ['SURVIVAL'],
  POLITICS: ['RELATIONSHIP', 'MYSTERY'],
  FOLKLORE: ['MYSTERY', 'RELATIONSHIP'],
}

function complexityForBrief(brief: ResolvedWorldBrief): StyleConfig['complexity'] {
  if (brief.themes.includes('POLITICS') || brief.social_form === 'EMPIRE') return 'HIGH'
  if (brief.themes.includes('MYSTERY') || brief.themes.length === 2) return 'MEDIUM'
  return 'LOW'
}

function pressureDescription(pressure: StoryPressure): string {
  if (pressure === 'CALM') return '允许长时间停留在日常与关系中，不主动制造危机'
  if (pressure === 'GENTLE') return '以人物愿望和自然变化推动故事，避免强行升级危险'
  if (pressure === 'ACTIVE') return '让线索、旅程或局势持续带来可回应的新变化'
  return '资源与环境形成持续压力，但仍保留真实选择和喘息空间'
}

export function worldBriefToStyleConfig(brief: ResolvedWorldBrief): StyleConfig {
  const drivers = brief.themes.flatMap((theme) => THEME_TO_DRIVERS[theme])
  const uniqueDrivers = [...new Set(drivers)].slice(0, 2)
  return {
    tone: `以 ${brief.world_tradition} 传统构建 ${brief.civilization_stage} 阶段的世界，主要舞台为 ${brief.primary_stage}，整体情绪为 ${brief.mood}`,
    complexity: complexityForBrief(brief),
    narrative_style: `${pressureDescription(brief.guidance.pressure)}；从 ${brief.guidance.event_sources.join('、')} 中自然产生事件`,
    player_archetype: '',
    story_drivers: uniqueDrivers,
    story_pressure: brief.guidance.pressure,
    world_brief: brief,
  }
}
