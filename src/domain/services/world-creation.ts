import type {
  ResolvedWorldBrief,
  ResolvedWorldKernel,
  StoryMood,
  StoryTheme,
  WorldBuilderConfig,
  WorldCreationDraft,
  WorldDetailQuestion,
  WorldFamily,
  WorldKernelDraft,
  WorldPresetDefinition,
} from '../models/world-creation.js'
import {
  HISTORICAL_ORDERS,
  MODERN_ANOMALY_RESPONSES,
  ResolvedWorldBriefSchema,
  SCIENCE_AUTHORITIES,
  SCIENCE_STAGES,
  STORY_MOODS,
  STORY_THEMES,
  WORLD_FAMILIES,
  WorldCreationDraftSchema,
  WorldKernelDraftSchema,
} from '../models/world-creation.js'
import type { StoryDriver, StoryPressure } from '../models/story.js'
import type { StyleConfig } from './extension-config.js'

const AUTO = 'AUTO' as const

export const WORLD_FAMILY_DEFAULTS: Record<WorldFamily, WorldKernelDraft> = {
  CONTEMPORARY: {
    family: 'CONTEMPORARY', environment: AUTO, social_sphere: AUTO, social_state: AUTO, realism: AUTO,
  },
  MODERN_ANOMALY: {
    family: 'MODERN_ANOMALY', environment: AUTO, anomaly_source: AUTO, visibility: AUTO, social_response: AUTO, anomaly_density: AUTO,
  },
  HISTORICAL: {
    family: 'HISTORICAL', era_profile: AUTO, civilization_inspiration: AUTO, stage: AUTO, political_order: AUTO, historicity: AUTO,
  },
  WUXIA: {
    family: 'WUXIA', era_context: AUTO, stage: AUTO, jianghu_order: AUTO, martial_ceiling: AUTO, public_status: AUTO,
  },
  EASTERN_FANTASY: {
    family: 'EASTERN_FANTASY', fantasy_tradition: AUTO, world_scope: AUTO, stage: AUTO, power_order: AUTO, power_prevalence: AUTO,
  },
  WESTERN_FANTASY: {
    family: 'WESTERN_FANTASY', technology_era: AUTO, magic_prevalence: AUTO, stage: AUTO, political_order: AUTO, peoples_relation: AUTO,
  },
  SCIENCE_FICTION: {
    family: 'SCIENCE_FICTION', future_scale: AUTO, stage: AUTO, authority: AUTO, technology_focus: AUTO, nonhuman_intelligence: AUTO, science_style: AUTO,
  },
  POST_COLLAPSE: {
    family: 'POST_COLLAPSE', collapse_cause: AUTO, time_since_collapse: AUTO, stage: AUTO, social_order: AUTO, technology_access: AUTO,
  },
}

const WORLD_QUESTIONS: Record<WorldFamily, readonly WorldDetailQuestion[]> = {
  CONTEMPORARY: [
    { field: 'environment', options: ['AUTO', 'MEGACITY', 'CITY', 'SMALL_TOWN', 'COUNTRYSIDE', 'REMOTE_REGION', 'CROSS_REGION_JOURNEY'] },
    { field: 'social_sphere', options: ['AUTO', 'CAMPUS', 'WORKPLACE', 'NEIGHBORHOOD', 'FAMILY_CIRCLE', 'PUBLIC_INSTITUTION', 'CULTURE_AND_SPORTS', 'MIXED_SPHERES'] },
    { field: 'social_state', options: ['AUTO', 'STABLE_DAILY', 'FAST_MOVING', 'IN_TRANSITION', 'LOCAL_DECLINE', 'LOCAL_REVIVAL', 'PROSPEROUS_PRESSURE'] },
    { field: 'realism', options: ['AUTO', 'LIGHTLY_IDEALIZED', 'EVERYDAY_REALISM', 'PROFESSIONAL_DETAIL', 'HARD_REALISM'] },
  ],
  MODERN_ANOMALY: [
    { field: 'environment', options: ['AUTO', 'MEGACITY', 'CITY', 'SMALL_TOWN', 'CAMPUS', 'COUNTRYSIDE', 'REMOTE_REGION'] },
    { field: 'anomaly_source', options: ['AUTO', 'FOLK_SPIRITS', 'SPECIAL_ABILITIES', 'NONHUMAN_PEOPLES', 'OCCULT_ARTS', 'ANOMALOUS_OBJECTS', 'UNKNOWN_PHENOMENA', 'MIXED_ANOMALIES'] },
    { field: 'visibility', options: ['AUTO', 'HIDDEN', 'RUMORED', 'LIMITED_KNOWLEDGE', 'SEMI_PUBLIC', 'PUBLIC_COEXISTENCE'] },
    { field: 'social_response', options: ['AUTO', 'UNMANAGED', 'FOLK_GROUPS', 'SECRET_ORGANIZATIONS', 'OFFICIAL_AGENCY', 'RESEARCH_INSTITUTIONS', 'COMMERCIAL_PARTICIPATION', 'INTEGRATED_PUBLIC_LIFE'] },
    { field: 'anomaly_density', options: ['AUTO', 'VERY_RARE', 'LOCAL_CLUSTER', 'SCATTERED', 'SOCIETY_SHAPING', 'EVERYDAY_NORMAL'] },
  ],
  HISTORICAL: [
    { field: 'era_profile', options: ['AUTO', 'EARLY_STATES', 'UNIFIED_DYNASTY', 'PROSPEROUS_TRADE_AGE', 'DYNASTIC_DECLINE', 'EARLY_INDUSTRIAL', 'URBANIZING_MODERN'] },
    { field: 'civilization_inspiration', options: ['AUTO', 'EAST_ASIAN_DYNASTY', 'EUROPEAN_FEUDAL', 'MEDITERRANEAN_CLASSICAL', 'STEPPE_FRONTIER', 'MARITIME_TRADE', 'CROSSROADS_CIVILIZATION'] },
    { field: 'stage', options: ['AUTO', 'CAPITAL_COURT', 'PREFECTURE_TOWN', 'VILLAGE_COUNTRYSIDE', 'PORT_TRADE_ROUTE', 'BORDERLAND', 'MANOR_ESTATE', 'COLONIAL_CITY', 'INDUSTRIAL_CITY', 'MULTI_REGION_JOURNEY'] },
    { field: 'political_order', options: ['AUTO', 'CENTRAL_DYNASTY', 'FEUDAL_LORDS', 'CITY_LEAGUE', 'REGIONAL_DIVISION', 'NOBLE_COUNCIL', 'COLONIAL_ORDER', 'EARLY_REPUBLIC', 'COMPETING_POWERS'] },
    { field: 'historicity', options: ['AUTO', 'REAL_HISTORY', 'HISTORY_INSPIRED', 'FICTIONAL_REALISM'] },
  ],
  WUXIA: [
    { field: 'era_context', options: ['AUTO', 'PROSPEROUS_REIGN', 'DYNASTY_END', 'WARRING_STATES', 'BORDER_TURMOIL', 'TIMELESS_JIANGHU'] },
    { field: 'stage', options: ['AUTO', 'MOUNTAIN_SECT', 'TOWN_INN', 'CAPITAL_COURT', 'BORDERLAND', 'HERMITAGE', 'ROAMING_JIANGHU'] },
    { field: 'jianghu_order', options: ['AUTO', 'SECT_ALLIANCE', 'GREAT_CLANS', 'COURT_REGULATED', 'COURT_JIANGHU_PARALLEL', 'FRAGMENTED_FACTIONS', 'LOOSE_JIANGHU'] },
    { field: 'martial_ceiling', options: ['AUTO', 'REALISTIC_MARTIAL_ARTS', 'INNER_FORCE', 'LEGENDARY_MARTIAL_ARTS', 'MYTHIC_WUXIA'] },
    { field: 'public_status', options: ['AUTO', 'HIDDEN_CIRCLES', 'PUBLICLY_KNOWN', 'NORMAL_SOCIAL_STRATUM', 'OFFICIALLY_REGISTERED', 'REGIONALLY_VARIED'] },
  ],
  EASTERN_FANTASY: [
    { field: 'fantasy_tradition', options: ['AUTO', 'XIANXIA_CULTIVATION', 'GODS_AND_FATE', 'SPIRIT_COEXISTENCE', 'EASTERN_XUANHUAN', 'FOLKLORE_STRANGE', 'MIXED_EASTERN_FANTASY'] },
    { field: 'world_scope', options: ['AUTO', 'ONE_REGION', 'VAST_MORTAL_WORLD', 'MORTAL_SPIRIT_REALMS', 'MULTIPLE_REALMS', 'COSMIC_HIERARCHY'] },
    { field: 'stage', options: ['AUTO', 'CULTIVATION_SECT', 'DYNASTY_CAPITAL', 'FANTASY_CITY', 'TOWN_COUNTRYSIDE', 'WILDERNESS_SECRET_REALM', 'SEAS_AND_ISLANDS', 'DIVINE_SPIRIT_REALM', 'MULTI_REGION_JOURNEY'] },
    { field: 'power_order', options: ['AUTO', 'GIFTED_FEW', 'SECTS_AND_LINEAGES', 'BLOODLINE_CLANS', 'IMPERIAL_INSTITUTIONS', 'DIVINE_AGENTS', 'COMMON_ACCESS', 'MULTIPLE_POWER_SYSTEMS'] },
    { field: 'power_prevalence', options: ['AUTO', 'RARE_LEGEND', 'ELITE_MONOPOLY', 'STABLE_SUPERNATURAL_CLASS', 'WIDELY_LEARNABLE', 'EVERYDAY_INFRASTRUCTURE'] },
  ],
  WESTERN_FANTASY: [
    { field: 'technology_era', options: ['AUTO', 'TRIBAL_CLASSICAL', 'MEDIEVAL_CRAFT', 'COMMERCIAL_CITY_STATES', 'RENAISSANCE_FIREARMS', 'INDUSTRIAL_DAWN', 'MAGITECH_CIVILIZATION'] },
    { field: 'magic_prevalence', options: ['AUTO', 'MAGIC_AS_LEGEND', 'RARE_CASTERS', 'INSTITUTIONAL_MONOPOLY', 'COMMONLY_LEARNABLE', 'MAGICAL_INFRASTRUCTURE'] },
    { field: 'stage', options: ['AUTO', 'KINGDOM_CAPITAL', 'CITY_STATE_PORT', 'MANOR_TERRITORY', 'MAGIC_ACADEMY', 'ADVENTURER_CITY', 'WILDERNESS_FRONTIER', 'MULTI_PEOPLE_CITY', 'QUESTING_JOURNEY'] },
    { field: 'political_order', options: ['AUTO', 'MONARCHY_AND_LORDS', 'CITY_COUNCILS', 'CHURCH_ORDER', 'MAGICAL_INSTITUTIONS', 'GUILDS_AND_COMMERCE', 'MULTI_PEOPLE_ALLIANCE', 'RIVAL_KINGDOMS'] },
    { field: 'peoples_relation', options: ['AUTO', 'HUMAN_MAJORITY', 'MIXED_PEOPLES', 'SEPARATE_HOMELANDS', 'HIDDEN_NONHUMANS', 'MULTI_PEOPLE_STATE'] },
  ],
  SCIENCE_FICTION: [
    { field: 'future_scale', options: ['AUTO', 'NEAR_FUTURE_EARTH', 'EARTH_MOON_ERA', 'SOLAR_COLONIZATION', 'EARLY_INTERSTELLAR', 'MATURE_INTERSTELLAR'] },
    { field: 'stage', options: ['AUTO', 'FUTURE_MEGACITY', 'ORDINARY_CITY', 'RESEARCH_BASE', 'OCEAN_FACILITY', 'ORBITAL_STATION', 'LUNAR_CITY', 'MARS_COLONY', 'RESOURCE_OUTPOST', 'INTERPLANETARY_SHIP', 'CORE_PLANET', 'GIANT_STATION', 'FRONTIER_COLONY', 'STARSHIP', 'ALIEN_RUINS', 'MULTIPLE_SYSTEMS'] },
    { field: 'authority', options: ['AUTO', 'NATION_STATES', 'INTERNATIONAL_ORGANIZATION', 'TECH_GIANTS', 'CITY_AUTONOMY', 'COLONIAL_ADMINISTRATION', 'SOLAR_ALLIANCE', 'CORPORATE_CONSORTIUM', 'PLANETARY_AUTONOMY', 'INTERSTELLAR_FEDERATION', 'STELLAR_EMPIRE', 'CORPORATE_TERRITORIES', 'COLONIAL_ALLIANCE', 'DECENTRALIZED_SPACE_COMMUNITIES'] },
    { field: 'technology_focus', options: ['AUTO', 'AI_AND_ROBOTICS', 'VIRTUAL_NETWORKS', 'BIOTECHNOLOGY', 'SPACEFLIGHT', 'ENERGY_ENGINEERING', 'ECOLOGICAL_ENGINEERING', 'HUMAN_AUGMENTATION', 'BALANCED_TECHNOLOGY'] },
    { field: 'nonhuman_intelligence', options: ['AUTO', 'HUMANS_ONLY', 'ADVANCED_AI', 'SIMPLE_ALIEN_LIFE', 'FIRST_CONTACT', 'MULTIPLE_CIVILIZATIONS', 'UNKNOWN_INTELLIGENCE'] },
    { field: 'science_style', options: ['AUTO', 'GROUNDED_EXTRAPOLATION', 'BALANCED_SCIENCE', 'SOCIAL_SCIENCE_FICTION', 'SPACE_OPERA'] },
  ],
  POST_COLLAPSE: [
    { field: 'collapse_cause', options: ['AUTO', 'CLIMATE_ECOLOGY', 'PANDEMIC', 'WARFARE', 'TECHNOLOGY_FAILURE', 'COSMIC_GEOLOGICAL', 'UNKNOWN_ANOMALY', 'FORGOTTEN_CAUSE'] },
    { field: 'time_since_collapse', options: ['AUTO', 'ONGOING_COLLAPSE', 'WITHIN_YEARS', 'ONE_GENERATION', 'MANY_GENERATIONS', 'OLD_WORLD_AS_LEGEND'] },
    { field: 'stage', options: ['AUTO', 'URBAN_RUINS', 'SURVIVOR_OUTPOST', 'NEW_SETTLEMENT', 'UNDERGROUND_FACILITY', 'WILDERNESS_ROAD', 'ISLAND_COMMUNITY', 'REBUILDING_CITY'] },
    { field: 'social_order', options: ['AUTO', 'FAMILY_GROUPS', 'COMMUNITY_SELF_RULE', 'SETTLEMENT_ALLIANCE', 'MILITARY_ADMINISTRATION', 'WARLORD_RULE', 'CARAVAN_NETWORK', 'REBUILDING_GOVERNMENT'] },
    { field: 'technology_access', options: ['AUTO', 'TECHNOLOGY_LOST', 'RELICS_ONLY', 'REPAIR_NOT_PRODUCE', 'PARTIAL_INDUSTRY', 'MIXED_REDEVELOPMENT'] },
  ],
}

export function createEmptyWorldDraft(): WorldCreationDraft {
  return {
    schema_version: 2,
    kernel: null,
    source_preset_id: null,
    primary_theme: null,
    secondary_theme: null,
    mood: 'AUTO',
    custom_requirements: '',
    excluded_content: '',
  }
}

export function applyWorldFamily(draft: WorldCreationDraft, family: WorldFamily): WorldCreationDraft {
  return {
    ...draft,
    kernel: { ...WORLD_FAMILY_DEFAULTS[family] },
    source_preset_id: null,
  }
}

function createPreset(
  id: string,
  label: string,
  description: string,
  family: WorldFamily,
  kernelValues: Record<string, string>,
  primaryTheme: StoryTheme,
  secondaryTheme: StoryTheme | null,
  mood: Exclude<StoryMood, 'AUTO'>,
): WorldPresetDefinition {
  const kernel = WorldKernelDraftSchema.parse({ ...WORLD_FAMILY_DEFAULTS[family], ...kernelValues })
  return {
    id,
    label,
    description,
    draft: WorldCreationDraftSchema.parse({
      ...createEmptyWorldDraft(),
      kernel,
      source_preset_id: id,
      primary_theme: primaryTheme,
      secondary_theme: secondaryTheme,
      mood,
    }),
  }
}

export const WORLD_PRESETS: WorldPresetDefinition[] = [
  createPreset('modern_city', '现代都市', '城市生活、工作与人物关系', 'CONTEMPORARY', {
    environment: 'MEGACITY', social_sphere: 'WORKPLACE', social_state: 'FAST_MOVING', realism: 'EVERYDAY_REALISM',
  }, 'RELATIONSHIP', 'GROWTH', 'BRIGHT'),
  createPreset('campus_youth', '校园青春', '校园里的友情、成长与朦胧心事', 'CONTEMPORARY', {
    environment: 'CITY', social_sphere: 'CAMPUS', social_state: 'STABLE_DAILY', realism: 'LIGHTLY_IDEALIZED',
  }, 'GROWTH', 'RELATIONSHIP', 'WARM'),
  createPreset('cozy_town', '温馨小镇', '邻里、四季和慢慢展开的生活', 'CONTEMPORARY', {
    environment: 'SMALL_TOWN', social_sphere: 'NEIGHBORHOOD', social_state: 'STABLE_DAILY', realism: 'EVERYDAY_REALISM',
  }, 'DAILY', 'RELATIONSHIP', 'WARM'),
  createPreset('modern_anomaly', '现代异闻', '熟悉生活边缘若隐若现的异常', 'MODERN_ANOMALY', {
    environment: 'CITY', anomaly_source: 'ANOMALOUS_OBJECTS', visibility: 'LIMITED_KNOWLEDGE', social_response: 'SECRET_ORGANIZATIONS', anomaly_density: 'SCATTERED',
  }, 'MYSTERY', 'RELATIONSHIP', 'MYSTERIOUS'),
  createPreset('ancient_life', '古代生活', '古城市井、家业手艺与普通人的日常', 'HISTORICAL', {
    era_profile: 'PROSPEROUS_TRADE_AGE', civilization_inspiration: 'EAST_ASIAN_DYNASTY', stage: 'PREFECTURE_TOWN', political_order: 'CENTRAL_DYNASTY', historicity: 'FICTIONAL_REALISM',
  }, 'DAILY', 'CAREER', 'WARM'),
  createPreset('court_politics', '宫廷权谋', '朝堂、家国与多方利益交错', 'HISTORICAL', {
    era_profile: 'UNIFIED_DYNASTY', civilization_inspiration: 'EAST_ASIAN_DYNASTY', stage: 'CAPITAL_COURT', political_order: 'CENTRAL_DYNASTY', historicity: 'HISTORY_INSPIRED',
  }, 'POLITICS', 'MYSTERY', 'SOMBER'),
  createPreset('wuxia', '江湖武侠', '门派、游历、情义与自我磨砺', 'WUXIA', {
    era_context: 'TIMELESS_JIANGHU', stage: 'ROAMING_JIANGHU', jianghu_order: 'SECT_ALLIANCE', martial_ceiling: 'INNER_FORCE', public_status: 'PUBLICLY_KNOWN',
  }, 'ADVENTURE', 'GROWTH', 'PASSIONATE'),
  createPreset('xianxia', '东方仙侠', '山门修行、人间游历与广阔天地', 'EASTERN_FANTASY', {
    fantasy_tradition: 'XIANXIA_CULTIVATION', world_scope: 'MORTAL_SPIRIT_REALMS', stage: 'CULTIVATION_SECT', power_order: 'SECTS_AND_LINEAGES', power_prevalence: 'STABLE_SUPERNATURAL_CLASS',
  }, 'GROWTH', 'ADVENTURE', 'MYSTERIOUS'),
  createPreset('western_kingdom', '西方王国', '王国、边境与魔法共存的冒险世界', 'WESTERN_FANTASY', {
    technology_era: 'MEDIEVAL_CRAFT', magic_prevalence: 'RARE_CASTERS', stage: 'KINGDOM_CAPITAL', political_order: 'MONARCHY_AND_LORDS', peoples_relation: 'HUMAN_MAJORITY',
  }, 'ADVENTURE', 'RELATIONSHIP', 'BRIGHT'),
  createPreset('magic_academy', '魔法学院', '制度化魔法中的校园生活与成长', 'WESTERN_FANTASY', {
    technology_era: 'COMMERCIAL_CITY_STATES', magic_prevalence: 'INSTITUTIONAL_MONOPOLY', stage: 'MAGIC_ACADEMY', political_order: 'MAGICAL_INSTITUTIONS', peoples_relation: 'MIXED_PEOPLES',
  }, 'GROWTH', 'MYSTERY', 'WARM'),
  createPreset('near_future_city', '近未来都市', '技术变迁中的城市生活与人际选择', 'SCIENCE_FICTION', {
    future_scale: 'NEAR_FUTURE_EARTH', stage: 'FUTURE_MEGACITY', authority: 'NATION_STATES', technology_focus: 'AI_AND_ROBOTICS', nonhuman_intelligence: 'ADVANCED_AI', science_style: 'SOCIAL_SCIENCE_FICTION',
  }, 'RELATIONSHIP', 'MYSTERY', 'COLD'),
  createPreset('space_voyage', '星际远航', '星舰、未知星域与新的文明接触', 'SCIENCE_FICTION', {
    future_scale: 'MATURE_INTERSTELLAR', stage: 'STARSHIP', authority: 'INTERSTELLAR_FEDERATION', technology_focus: 'SPACEFLIGHT', nonhuman_intelligence: 'FIRST_CONTACT', science_style: 'SPACE_OPERA',
  }, 'ADVENTURE', 'CIVILIZATION', 'MYSTERIOUS'),
  createPreset('post_apocalypse', '末日废土', '文明余烬中的生存、同行与重建', 'POST_COLLAPSE', {
    collapse_cause: 'TECHNOLOGY_FAILURE', time_since_collapse: 'ONE_GENERATION', stage: 'NEW_SETTLEMENT', social_order: 'COMMUNITY_SELF_RULE', technology_access: 'REPAIR_NOT_PRODUCE',
  }, 'SURVIVAL', 'CIVILIZATION', 'SOMBER'),
]

export const WORLD_BUILDER_CONFIG: WorldBuilderConfig = {
  schema_version: 2,
  presets: WORLD_PRESETS,
  catalogs: {
    families: WORLD_FAMILIES.map((family) => ({ family, questions: WORLD_QUESTIONS[family] })),
    themes: STORY_THEMES,
    moods: STORY_MOODS,
  },
}

export function applyWorldPreset(draft: WorldCreationDraft, preset: WorldPresetDefinition): WorldCreationDraft {
  return { ...preset.draft, excluded_content: draft.excluded_content }
}

export function isDraftBasedOnPreset(draft: WorldCreationDraft, preset: WorldPresetDefinition): boolean {
  const comparable = (value: WorldCreationDraft) => JSON.stringify({
    kernel: value.kernel,
    primary_theme: value.primary_theme,
    secondary_theme: value.secondary_theme,
    mood: value.mood,
    custom_requirements: value.custom_requirements,
  })
  return comparable(draft) === comparable(preset.draft)
}

export function getWorldQuestions(family: WorldFamily): readonly WorldDetailQuestion[] {
  return WORLD_QUESTIONS[family]
}

export function getAvailableWorldDetailOptions(kernel: WorldKernelDraft, field: string): readonly string[] {
  const base = WORLD_QUESTIONS[kernel.family].find((question) => question.field === field)?.options ?? ['AUTO']
  if (kernel.family === 'MODERN_ANOMALY' && field === 'social_response' && kernel.visibility !== 'AUTO') {
    return ['AUTO', ...(MODERN_ANOMALY_RESPONSES[kernel.visibility] ?? [])]
  }
  if (kernel.family === 'HISTORICAL' && field === 'political_order' && kernel.era_profile !== 'AUTO') {
    return ['AUTO', ...(HISTORICAL_ORDERS[kernel.era_profile] ?? [])]
  }
  if (kernel.family === 'HISTORICAL' && field === 'stage' && !['AUTO', 'EARLY_INDUSTRIAL', 'URBANIZING_MODERN'].includes(kernel.era_profile)) {
    return base.filter((value) => !['COLONIAL_CITY', 'INDUSTRIAL_CITY'].includes(value))
  }
  if (kernel.family === 'EASTERN_FANTASY' && field === 'world_scope' && kernel.fantasy_tradition === 'FOLKLORE_STRANGE') {
    return base.filter((value) => !['MULTIPLE_REALMS', 'COSMIC_HIERARCHY'].includes(value))
  }
  if (kernel.family === 'WESTERN_FANTASY' && field === 'magic_prevalence' && !['AUTO', 'INDUSTRIAL_DAWN', 'MAGITECH_CIVILIZATION'].includes(kernel.technology_era)) {
    return base.filter((value) => value !== 'MAGICAL_INFRASTRUCTURE')
  }
  if (kernel.family === 'SCIENCE_FICTION' && kernel.future_scale !== 'AUTO') {
    if (field === 'stage') return ['AUTO', ...(SCIENCE_STAGES[kernel.future_scale] ?? [])]
    if (field === 'authority') return ['AUTO', ...(SCIENCE_AUTHORITIES[kernel.future_scale] ?? [])]
  }
  return base
}

export function updateWorldKernelField(kernel: WorldKernelDraft, field: string, value: string): WorldKernelDraft {
  const next = { ...kernel, [field]: value } as unknown as WorldKernelDraft
  if (next.family === 'MODERN_ANOMALY' && field === 'visibility') next.social_response = 'AUTO'
  if (next.family === 'HISTORICAL' && field === 'era_profile') {
    next.political_order = 'AUTO'
    if (!['EARLY_INDUSTRIAL', 'URBANIZING_MODERN'].includes(next.era_profile) && ['COLONIAL_CITY', 'INDUSTRIAL_CITY'].includes(next.stage)) next.stage = 'AUTO'
  }
  if (next.family === 'EASTERN_FANTASY') {
    if (field === 'fantasy_tradition' && next.fantasy_tradition === 'FOLKLORE_STRANGE' && ['MULTIPLE_REALMS', 'COSMIC_HIERARCHY'].includes(next.world_scope)) next.world_scope = 'AUTO'
    if (field === 'world_scope' && ['MULTIPLE_REALMS', 'COSMIC_HIERARCHY'].includes(next.world_scope) && next.fantasy_tradition === 'FOLKLORE_STRANGE') next.fantasy_tradition = 'AUTO'
  }
  if (next.family === 'WESTERN_FANTASY') {
    if (field === 'technology_era' && !['AUTO', 'INDUSTRIAL_DAWN', 'MAGITECH_CIVILIZATION'].includes(next.technology_era) && next.magic_prevalence === 'MAGICAL_INFRASTRUCTURE') next.magic_prevalence = 'AUTO'
    if (field === 'magic_prevalence' && next.magic_prevalence === 'MAGICAL_INFRASTRUCTURE' && !['AUTO', 'INDUSTRIAL_DAWN', 'MAGITECH_CIVILIZATION'].includes(next.technology_era)) next.technology_era = 'AUTO'
  }
  if (next.family === 'SCIENCE_FICTION' && field === 'future_scale') {
    next.stage = 'AUTO'
    next.authority = 'AUTO'
  }
  return WorldKernelDraftSchema.parse(next)
}

function pick<T extends string>(value: T | 'AUTO', fallback: T): T {
  return value === 'AUTO' ? fallback : value
}

function resolveKernel(kernel: WorldKernelDraft): ResolvedWorldKernel {
  switch (kernel.family) {
    case 'CONTEMPORARY': return {
      family: kernel.family,
      environment: pick(kernel.environment, 'CITY'),
      social_sphere: pick(kernel.social_sphere, 'MIXED_SPHERES'),
      social_state: pick(kernel.social_state, 'STABLE_DAILY'),
      realism: pick(kernel.realism, 'EVERYDAY_REALISM'),
    }
    case 'MODERN_ANOMALY': {
      const visibility = pick(kernel.visibility, 'LIMITED_KNOWLEDGE')
      return {
        family: kernel.family,
        environment: pick(kernel.environment, 'CITY'),
        anomaly_source: pick(kernel.anomaly_source, 'UNKNOWN_PHENOMENA'),
        visibility,
        social_response: pick(kernel.social_response, MODERN_ANOMALY_RESPONSES[visibility]![0] as Exclude<typeof kernel.social_response, 'AUTO'>),
        anomaly_density: pick(kernel.anomaly_density, 'SCATTERED'),
      }
    }
    case 'HISTORICAL': {
      const era = pick(kernel.era_profile, 'PROSPEROUS_TRADE_AGE')
      return {
        family: kernel.family,
        era_profile: era,
        civilization_inspiration: pick(kernel.civilization_inspiration, 'EAST_ASIAN_DYNASTY'),
        stage: pick(kernel.stage, ['EARLY_INDUSTRIAL', 'URBANIZING_MODERN'].includes(era) ? 'INDUSTRIAL_CITY' : 'PREFECTURE_TOWN'),
        political_order: pick(kernel.political_order, HISTORICAL_ORDERS[era]![0] as Exclude<typeof kernel.political_order, 'AUTO'>),
        historicity: pick(kernel.historicity, 'FICTIONAL_REALISM'),
      }
    }
    case 'WUXIA': return {
      family: kernel.family,
      era_context: pick(kernel.era_context, 'TIMELESS_JIANGHU'),
      stage: pick(kernel.stage, 'ROAMING_JIANGHU'),
      jianghu_order: pick(kernel.jianghu_order, 'SECT_ALLIANCE'),
      martial_ceiling: pick(kernel.martial_ceiling, 'INNER_FORCE'),
      public_status: pick(kernel.public_status, 'PUBLICLY_KNOWN'),
    }
    case 'EASTERN_FANTASY': {
      const tradition = pick(kernel.fantasy_tradition, 'XIANXIA_CULTIVATION')
      return {
        family: kernel.family,
        fantasy_tradition: tradition,
        world_scope: pick(kernel.world_scope, tradition === 'FOLKLORE_STRANGE' ? 'ONE_REGION' : 'MORTAL_SPIRIT_REALMS'),
        stage: pick(kernel.stage, tradition === 'FOLKLORE_STRANGE' ? 'TOWN_COUNTRYSIDE' : 'CULTIVATION_SECT'),
        power_order: pick(kernel.power_order, tradition === 'FOLKLORE_STRANGE' ? 'GIFTED_FEW' : 'SECTS_AND_LINEAGES'),
        power_prevalence: pick(kernel.power_prevalence, tradition === 'FOLKLORE_STRANGE' ? 'RARE_LEGEND' : 'STABLE_SUPERNATURAL_CLASS'),
      }
    }
    case 'WESTERN_FANTASY': {
      const magic = pick(kernel.magic_prevalence, 'RARE_CASTERS')
      return {
        family: kernel.family,
        technology_era: pick(kernel.technology_era, magic === 'MAGICAL_INFRASTRUCTURE' ? 'INDUSTRIAL_DAWN' : 'MEDIEVAL_CRAFT'),
        magic_prevalence: magic,
        stage: pick(kernel.stage, 'KINGDOM_CAPITAL'),
        political_order: pick(kernel.political_order, 'MONARCHY_AND_LORDS'),
        peoples_relation: pick(kernel.peoples_relation, 'HUMAN_MAJORITY'),
      }
    }
    case 'SCIENCE_FICTION': {
      const scale = pick(kernel.future_scale, 'NEAR_FUTURE_EARTH')
      return {
        family: kernel.family,
        future_scale: scale,
        stage: pick(kernel.stage, SCIENCE_STAGES[scale]![0] as Exclude<typeof kernel.stage, 'AUTO'>),
        authority: pick(kernel.authority, SCIENCE_AUTHORITIES[scale]![0] as Exclude<typeof kernel.authority, 'AUTO'>),
        technology_focus: pick(kernel.technology_focus, 'BALANCED_TECHNOLOGY'),
        nonhuman_intelligence: pick(kernel.nonhuman_intelligence, scale === 'NEAR_FUTURE_EARTH' ? 'ADVANCED_AI' : 'UNKNOWN_INTELLIGENCE'),
        science_style: pick(kernel.science_style, scale === 'NEAR_FUTURE_EARTH' ? 'SOCIAL_SCIENCE_FICTION' : 'BALANCED_SCIENCE'),
      }
    }
    case 'POST_COLLAPSE': return {
      family: kernel.family,
      collapse_cause: pick(kernel.collapse_cause, 'FORGOTTEN_CAUSE'),
      time_since_collapse: pick(kernel.time_since_collapse, 'ONE_GENERATION'),
      stage: pick(kernel.stage, 'NEW_SETTLEMENT'),
      social_order: pick(kernel.social_order, 'COMMUNITY_SELF_RULE'),
      technology_access: pick(kernel.technology_access, 'REPAIR_NOT_PRODUCE'),
    }
  }
}

const THEME_GUIDANCE: Record<StoryTheme, ResolvedWorldBrief['guidance']> = {
  DAILY: { mode: 'OPEN', pressure: 'CALM', event_sources: ['ROUTINE', 'CRAFT', 'COMMUNITY'] },
  RELATIONSHIP: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['RELATIONSHIPS', 'CHOICES', 'CHANGE'] },
  ROMANCE: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['ATTRACTION', 'TRUST', 'SHARED_LIFE'] },
  GROWTH: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['PRACTICE', 'CHOICES', 'CONSEQUENCES'] },
  CAREER: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['WORK', 'CRAFT', 'OPPORTUNITIES'] },
  COMPETITION: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['TRAINING', 'RIVALS', 'MILESTONES'] },
  ADVENTURE: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['DISCOVERY', 'TRAVEL', 'OBSTACLES'] },
  MYSTERY: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['CLUES', 'SECRETS', 'REVELATIONS'] },
  SURVIVAL: { mode: 'DIRECTED', pressure: 'INTENSE', event_sources: ['SCARCITY', 'ENVIRONMENT', 'HARD_CHOICES'] },
  HORROR: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['DREAD', 'UNCERTAINTY', 'CONSEQUENCES'] },
  POLITICS: { mode: 'DIRECTED', pressure: 'ACTIVE', event_sources: ['FACTIONS', 'NEGOTIATION', 'CONSEQUENCES'] },
  WAR: { mode: 'DIRECTED', pressure: 'INTENSE', event_sources: ['FRONTS', 'DISPLACEMENT', 'HARD_CHOICES'] },
  CIVILIZATION: { mode: 'SUPPORTIVE', pressure: 'GENTLE', event_sources: ['BUILDING', 'COOPERATION', 'LONG_TERM_CHANGE'] },
}

export function resolveWorldCreationDraft(input: WorldCreationDraft): ResolvedWorldBrief {
  const draft = WorldCreationDraftSchema.parse(input)
  if (!draft.kernel || !draft.primary_theme) throw new Error('World draft must include a world family and primary theme')
  const themes = [draft.primary_theme]
  if (draft.secondary_theme) themes.push(draft.secondary_theme)
  return ResolvedWorldBriefSchema.parse({
    schema_version: 2,
    kernel: resolveKernel(draft.kernel),
    themes,
    mood: draft.mood === 'AUTO' ? defaultMoodForFamily(draft.kernel.family) : draft.mood,
    custom_requirements: draft.custom_requirements,
    excluded_content: draft.excluded_content,
    guidance: THEME_GUIDANCE[draft.primary_theme],
  })
}

function defaultMoodForFamily(family: WorldFamily): Exclude<StoryMood, 'AUTO'> {
  if (family === 'MODERN_ANOMALY' || family === 'EASTERN_FANTASY') return 'MYSTERIOUS'
  if (family === 'SCIENCE_FICTION') return 'COLD'
  if (family === 'POST_COLLAPSE') return 'SOMBER'
  if (family === 'WUXIA') return 'PASSIONATE'
  return 'WARM'
}

const THEME_TO_DRIVERS: Record<StoryTheme, StoryDriver[]> = {
  DAILY: ['RELATIONSHIP', 'GROWTH'],
  RELATIONSHIP: ['RELATIONSHIP'],
  ROMANCE: ['RELATIONSHIP'],
  GROWTH: ['GROWTH'],
  CAREER: ['GROWTH', 'RELATIONSHIP'],
  COMPETITION: ['GROWTH'],
  ADVENTURE: ['EXPLORATION'],
  MYSTERY: ['MYSTERY'],
  SURVIVAL: ['SURVIVAL'],
  HORROR: ['MYSTERY', 'SURVIVAL'],
  POLITICS: ['RELATIONSHIP', 'MYSTERY'],
  WAR: ['SURVIVAL', 'RELATIONSHIP'],
  CIVILIZATION: ['GROWTH', 'RELATIONSHIP'],
}

function complexityForBrief(brief: ResolvedWorldBrief): StyleConfig['complexity'] {
  if (brief.themes.some((theme) => ['POLITICS', 'WAR', 'CIVILIZATION'].includes(theme))) return 'HIGH'
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
  const detailValues = Object.entries(brief.kernel).filter(([field]) => field !== 'family').map(([, value]) => value)
  return {
    tone: `${brief.kernel.family} 世界；${detailValues.join('、')}；整体情绪为 ${brief.mood}`,
    complexity: complexityForBrief(brief),
    narrative_style: `${pressureDescription(brief.guidance.pressure)}；从 ${brief.guidance.event_sources.join('、')} 中自然产生事件`,
    player_archetype: '',
    story_drivers: uniqueDrivers,
    story_pressure: brief.guidance.pressure,
    world_brief: brief,
  }
}
