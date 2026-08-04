import { z } from 'zod/v4'
import { StoryPressureSchema } from './story.js'

export const WORLD_FAMILIES = [
  'CONTEMPORARY',
  'MODERN_ANOMALY',
  'HISTORICAL',
  'WUXIA',
  'EASTERN_FANTASY',
  'WESTERN_FANTASY',
  'SCIENCE_FICTION',
  'POST_COLLAPSE',
] as const

export const STORY_THEMES = [
  'DAILY',
  'RELATIONSHIP',
  'ROMANCE',
  'GROWTH',
  'CAREER',
  'COMPETITION',
  'ADVENTURE',
  'MYSTERY',
  'SURVIVAL',
  'HORROR',
  'POLITICS',
  'WAR',
  'CIVILIZATION',
] as const

export const STORY_MOODS = [
  'AUTO',
  'BRIGHT',
  'WARM',
  'HEALING',
  'ROMANTIC',
  'HUMOROUS',
  'PASSIONATE',
  'MYSTERIOUS',
  'TENSE',
  'QUIET',
  'SOMBER',
  'COLD',
  'ABSURD',
] as const

const ContemporaryKernelSchema = z.object({
  family: z.literal('CONTEMPORARY'),
  environment: z.enum(['AUTO', 'MEGACITY', 'CITY', 'SMALL_TOWN', 'COUNTRYSIDE', 'REMOTE_REGION', 'CROSS_REGION_JOURNEY']),
  social_sphere: z.enum(['AUTO', 'CAMPUS', 'WORKPLACE', 'NEIGHBORHOOD', 'FAMILY_CIRCLE', 'PUBLIC_INSTITUTION', 'CULTURE_AND_SPORTS', 'MIXED_SPHERES']),
  social_state: z.enum(['AUTO', 'STABLE_DAILY', 'FAST_MOVING', 'IN_TRANSITION', 'LOCAL_DECLINE', 'LOCAL_REVIVAL', 'PROSPEROUS_PRESSURE']),
  realism: z.enum(['AUTO', 'LIGHTLY_IDEALIZED', 'EVERYDAY_REALISM', 'PROFESSIONAL_DETAIL', 'HARD_REALISM']),
})

const ModernAnomalyKernelSchema = z.object({
  family: z.literal('MODERN_ANOMALY'),
  environment: z.enum(['AUTO', 'MEGACITY', 'CITY', 'SMALL_TOWN', 'CAMPUS', 'COUNTRYSIDE', 'REMOTE_REGION']),
  anomaly_source: z.enum(['AUTO', 'FOLK_SPIRITS', 'SPECIAL_ABILITIES', 'NONHUMAN_PEOPLES', 'OCCULT_ARTS', 'ANOMALOUS_OBJECTS', 'UNKNOWN_PHENOMENA', 'MIXED_ANOMALIES']),
  visibility: z.enum(['AUTO', 'HIDDEN', 'RUMORED', 'LIMITED_KNOWLEDGE', 'SEMI_PUBLIC', 'PUBLIC_COEXISTENCE']),
  social_response: z.enum(['AUTO', 'UNMANAGED', 'FOLK_GROUPS', 'SECRET_ORGANIZATIONS', 'OFFICIAL_AGENCY', 'RESEARCH_INSTITUTIONS', 'COMMERCIAL_PARTICIPATION', 'INTEGRATED_PUBLIC_LIFE']),
  anomaly_density: z.enum(['AUTO', 'VERY_RARE', 'LOCAL_CLUSTER', 'SCATTERED', 'SOCIETY_SHAPING', 'EVERYDAY_NORMAL']),
})

const HistoricalKernelSchema = z.object({
  family: z.literal('HISTORICAL'),
  era_profile: z.enum(['AUTO', 'EARLY_STATES', 'UNIFIED_DYNASTY', 'PROSPEROUS_TRADE_AGE', 'DYNASTIC_DECLINE', 'EARLY_INDUSTRIAL', 'URBANIZING_MODERN']),
  civilization_inspiration: z.enum(['AUTO', 'EAST_ASIAN_DYNASTY', 'EUROPEAN_FEUDAL', 'MEDITERRANEAN_CLASSICAL', 'STEPPE_FRONTIER', 'MARITIME_TRADE', 'CROSSROADS_CIVILIZATION']),
  stage: z.enum(['AUTO', 'CAPITAL_COURT', 'PREFECTURE_TOWN', 'VILLAGE_COUNTRYSIDE', 'PORT_TRADE_ROUTE', 'BORDERLAND', 'MANOR_ESTATE', 'COLONIAL_CITY', 'INDUSTRIAL_CITY', 'MULTI_REGION_JOURNEY']),
  political_order: z.enum(['AUTO', 'CENTRAL_DYNASTY', 'FEUDAL_LORDS', 'CITY_LEAGUE', 'REGIONAL_DIVISION', 'NOBLE_COUNCIL', 'COLONIAL_ORDER', 'EARLY_REPUBLIC', 'COMPETING_POWERS']),
  historicity: z.enum(['AUTO', 'REAL_HISTORY', 'HISTORY_INSPIRED', 'FICTIONAL_REALISM']),
})

const WuxiaKernelSchema = z.object({
  family: z.literal('WUXIA'),
  era_context: z.enum(['AUTO', 'PROSPEROUS_REIGN', 'DYNASTY_END', 'WARRING_STATES', 'BORDER_TURMOIL', 'TIMELESS_JIANGHU']),
  stage: z.enum(['AUTO', 'MOUNTAIN_SECT', 'TOWN_INN', 'CAPITAL_COURT', 'BORDERLAND', 'HERMITAGE', 'ROAMING_JIANGHU']),
  jianghu_order: z.enum(['AUTO', 'SECT_ALLIANCE', 'GREAT_CLANS', 'COURT_REGULATED', 'COURT_JIANGHU_PARALLEL', 'FRAGMENTED_FACTIONS', 'LOOSE_JIANGHU']),
  martial_ceiling: z.enum(['AUTO', 'REALISTIC_MARTIAL_ARTS', 'INNER_FORCE', 'LEGENDARY_MARTIAL_ARTS', 'MYTHIC_WUXIA']),
  public_status: z.enum(['AUTO', 'HIDDEN_CIRCLES', 'PUBLICLY_KNOWN', 'NORMAL_SOCIAL_STRATUM', 'OFFICIALLY_REGISTERED', 'REGIONALLY_VARIED']),
})

const EasternFantasyKernelSchema = z.object({
  family: z.literal('EASTERN_FANTASY'),
  fantasy_tradition: z.enum(['AUTO', 'XIANXIA_CULTIVATION', 'GODS_AND_FATE', 'SPIRIT_COEXISTENCE', 'EASTERN_XUANHUAN', 'FOLKLORE_STRANGE', 'MIXED_EASTERN_FANTASY']),
  world_scope: z.enum(['AUTO', 'ONE_REGION', 'VAST_MORTAL_WORLD', 'MORTAL_SPIRIT_REALMS', 'MULTIPLE_REALMS', 'COSMIC_HIERARCHY']),
  stage: z.enum(['AUTO', 'CULTIVATION_SECT', 'DYNASTY_CAPITAL', 'FANTASY_CITY', 'TOWN_COUNTRYSIDE', 'WILDERNESS_SECRET_REALM', 'SEAS_AND_ISLANDS', 'DIVINE_SPIRIT_REALM', 'MULTI_REGION_JOURNEY']),
  power_order: z.enum(['AUTO', 'GIFTED_FEW', 'SECTS_AND_LINEAGES', 'BLOODLINE_CLANS', 'IMPERIAL_INSTITUTIONS', 'DIVINE_AGENTS', 'COMMON_ACCESS', 'MULTIPLE_POWER_SYSTEMS']),
  power_prevalence: z.enum(['AUTO', 'RARE_LEGEND', 'ELITE_MONOPOLY', 'STABLE_SUPERNATURAL_CLASS', 'WIDELY_LEARNABLE', 'EVERYDAY_INFRASTRUCTURE']),
})

const WesternFantasyKernelSchema = z.object({
  family: z.literal('WESTERN_FANTASY'),
  technology_era: z.enum(['AUTO', 'TRIBAL_CLASSICAL', 'MEDIEVAL_CRAFT', 'COMMERCIAL_CITY_STATES', 'RENAISSANCE_FIREARMS', 'INDUSTRIAL_DAWN', 'MAGITECH_CIVILIZATION']),
  magic_prevalence: z.enum(['AUTO', 'MAGIC_AS_LEGEND', 'RARE_CASTERS', 'INSTITUTIONAL_MONOPOLY', 'COMMONLY_LEARNABLE', 'MAGICAL_INFRASTRUCTURE']),
  stage: z.enum(['AUTO', 'KINGDOM_CAPITAL', 'CITY_STATE_PORT', 'MANOR_TERRITORY', 'MAGIC_ACADEMY', 'ADVENTURER_CITY', 'WILDERNESS_FRONTIER', 'MULTI_PEOPLE_CITY', 'QUESTING_JOURNEY']),
  political_order: z.enum(['AUTO', 'MONARCHY_AND_LORDS', 'CITY_COUNCILS', 'CHURCH_ORDER', 'MAGICAL_INSTITUTIONS', 'GUILDS_AND_COMMERCE', 'MULTI_PEOPLE_ALLIANCE', 'RIVAL_KINGDOMS']),
  peoples_relation: z.enum(['AUTO', 'HUMAN_MAJORITY', 'MIXED_PEOPLES', 'SEPARATE_HOMELANDS', 'HIDDEN_NONHUMANS', 'MULTI_PEOPLE_STATE']),
})

const ScienceFictionKernelSchema = z.object({
  family: z.literal('SCIENCE_FICTION'),
  future_scale: z.enum(['AUTO', 'NEAR_FUTURE_EARTH', 'EARTH_MOON_ERA', 'SOLAR_COLONIZATION', 'EARLY_INTERSTELLAR', 'MATURE_INTERSTELLAR']),
  stage: z.enum(['AUTO', 'FUTURE_MEGACITY', 'ORDINARY_CITY', 'RESEARCH_BASE', 'OCEAN_FACILITY', 'ORBITAL_STATION', 'LUNAR_CITY', 'MARS_COLONY', 'RESOURCE_OUTPOST', 'INTERPLANETARY_SHIP', 'CORE_PLANET', 'GIANT_STATION', 'FRONTIER_COLONY', 'STARSHIP', 'ALIEN_RUINS', 'MULTIPLE_SYSTEMS']),
  authority: z.enum(['AUTO', 'NATION_STATES', 'INTERNATIONAL_ORGANIZATION', 'TECH_GIANTS', 'CITY_AUTONOMY', 'COLONIAL_ADMINISTRATION', 'SOLAR_ALLIANCE', 'CORPORATE_CONSORTIUM', 'PLANETARY_AUTONOMY', 'INTERSTELLAR_FEDERATION', 'STELLAR_EMPIRE', 'CORPORATE_TERRITORIES', 'COLONIAL_ALLIANCE', 'DECENTRALIZED_SPACE_COMMUNITIES']),
  technology_focus: z.enum(['AUTO', 'AI_AND_ROBOTICS', 'VIRTUAL_NETWORKS', 'BIOTECHNOLOGY', 'SPACEFLIGHT', 'ENERGY_ENGINEERING', 'ECOLOGICAL_ENGINEERING', 'HUMAN_AUGMENTATION', 'BALANCED_TECHNOLOGY']),
  nonhuman_intelligence: z.enum(['AUTO', 'HUMANS_ONLY', 'ADVANCED_AI', 'SIMPLE_ALIEN_LIFE', 'FIRST_CONTACT', 'MULTIPLE_CIVILIZATIONS', 'UNKNOWN_INTELLIGENCE']),
  science_style: z.enum(['AUTO', 'GROUNDED_EXTRAPOLATION', 'BALANCED_SCIENCE', 'SOCIAL_SCIENCE_FICTION', 'SPACE_OPERA']),
})

const PostCollapseKernelSchema = z.object({
  family: z.literal('POST_COLLAPSE'),
  collapse_cause: z.enum(['AUTO', 'CLIMATE_ECOLOGY', 'PANDEMIC', 'WARFARE', 'TECHNOLOGY_FAILURE', 'COSMIC_GEOLOGICAL', 'UNKNOWN_ANOMALY', 'FORGOTTEN_CAUSE']),
  time_since_collapse: z.enum(['AUTO', 'ONGOING_COLLAPSE', 'WITHIN_YEARS', 'ONE_GENERATION', 'MANY_GENERATIONS', 'OLD_WORLD_AS_LEGEND']),
  stage: z.enum(['AUTO', 'URBAN_RUINS', 'SURVIVOR_OUTPOST', 'NEW_SETTLEMENT', 'UNDERGROUND_FACILITY', 'WILDERNESS_ROAD', 'ISLAND_COMMUNITY', 'REBUILDING_CITY']),
  social_order: z.enum(['AUTO', 'FAMILY_GROUPS', 'COMMUNITY_SELF_RULE', 'SETTLEMENT_ALLIANCE', 'MILITARY_ADMINISTRATION', 'WARLORD_RULE', 'CARAVAN_NETWORK', 'REBUILDING_GOVERNMENT']),
  technology_access: z.enum(['AUTO', 'TECHNOLOGY_LOST', 'RELICS_ONLY', 'REPAIR_NOT_PRODUCE', 'PARTIAL_INDUSTRY', 'MIXED_REDEVELOPMENT']),
})

const RawWorldKernelDraftSchema = z.discriminatedUnion('family', [
  ContemporaryKernelSchema,
  ModernAnomalyKernelSchema,
  HistoricalKernelSchema,
  WuxiaKernelSchema,
  EasternFantasyKernelSchema,
  WesternFantasyKernelSchema,
  ScienceFictionKernelSchema,
  PostCollapseKernelSchema,
])

export type WorldKernelDraft = z.infer<typeof RawWorldKernelDraftSchema>
export type WorldFamily = WorldKernelDraft['family']

export const MODERN_ANOMALY_RESPONSES: Record<string, readonly string[]> = {
  HIDDEN: ['UNMANAGED', 'FOLK_GROUPS', 'SECRET_ORGANIZATIONS'],
  RUMORED: ['UNMANAGED', 'FOLK_GROUPS', 'SECRET_ORGANIZATIONS', 'RESEARCH_INSTITUTIONS'],
  LIMITED_KNOWLEDGE: ['FOLK_GROUPS', 'SECRET_ORGANIZATIONS', 'OFFICIAL_AGENCY', 'RESEARCH_INSTITUTIONS'],
  SEMI_PUBLIC: ['FOLK_GROUPS', 'OFFICIAL_AGENCY', 'RESEARCH_INSTITUTIONS', 'COMMERCIAL_PARTICIPATION'],
  PUBLIC_COEXISTENCE: ['OFFICIAL_AGENCY', 'RESEARCH_INSTITUTIONS', 'COMMERCIAL_PARTICIPATION', 'INTEGRATED_PUBLIC_LIFE'],
}

export const HISTORICAL_ORDERS: Record<string, readonly string[]> = {
  EARLY_STATES: ['FEUDAL_LORDS', 'CITY_LEAGUE', 'REGIONAL_DIVISION'],
  UNIFIED_DYNASTY: ['CENTRAL_DYNASTY', 'FEUDAL_LORDS'],
  PROSPEROUS_TRADE_AGE: ['CENTRAL_DYNASTY', 'CITY_LEAGUE', 'NOBLE_COUNCIL', 'COMPETING_POWERS'],
  DYNASTIC_DECLINE: ['CENTRAL_DYNASTY', 'REGIONAL_DIVISION', 'COMPETING_POWERS'],
  EARLY_INDUSTRIAL: ['FEUDAL_LORDS', 'NOBLE_COUNCIL', 'COLONIAL_ORDER', 'EARLY_REPUBLIC', 'COMPETING_POWERS'],
  URBANIZING_MODERN: ['COLONIAL_ORDER', 'EARLY_REPUBLIC', 'COMPETING_POWERS'],
}

export const SCIENCE_STAGES: Record<string, readonly string[]> = {
  NEAR_FUTURE_EARTH: ['FUTURE_MEGACITY', 'ORDINARY_CITY', 'RESEARCH_BASE', 'OCEAN_FACILITY', 'ORBITAL_STATION'],
  EARTH_MOON_ERA: ['FUTURE_MEGACITY', 'RESEARCH_BASE', 'ORBITAL_STATION', 'LUNAR_CITY', 'INTERPLANETARY_SHIP'],
  SOLAR_COLONIZATION: ['ORBITAL_STATION', 'LUNAR_CITY', 'MARS_COLONY', 'RESOURCE_OUTPOST', 'INTERPLANETARY_SHIP'],
  EARLY_INTERSTELLAR: ['CORE_PLANET', 'GIANT_STATION', 'FRONTIER_COLONY', 'STARSHIP', 'ALIEN_RUINS'],
  MATURE_INTERSTELLAR: ['CORE_PLANET', 'GIANT_STATION', 'FRONTIER_COLONY', 'STARSHIP', 'ALIEN_RUINS', 'MULTIPLE_SYSTEMS'],
}

export const SCIENCE_AUTHORITIES: Record<string, readonly string[]> = {
  NEAR_FUTURE_EARTH: ['NATION_STATES', 'INTERNATIONAL_ORGANIZATION', 'TECH_GIANTS', 'CITY_AUTONOMY'],
  EARTH_MOON_ERA: ['NATION_STATES', 'INTERNATIONAL_ORGANIZATION', 'TECH_GIANTS', 'COLONIAL_ADMINISTRATION'],
  SOLAR_COLONIZATION: ['SOLAR_ALLIANCE', 'CORPORATE_CONSORTIUM', 'COLONIAL_ADMINISTRATION', 'PLANETARY_AUTONOMY'],
  EARLY_INTERSTELLAR: ['INTERSTELLAR_FEDERATION', 'STELLAR_EMPIRE', 'CORPORATE_TERRITORIES', 'COLONIAL_ALLIANCE', 'PLANETARY_AUTONOMY'],
  MATURE_INTERSTELLAR: ['INTERSTELLAR_FEDERATION', 'STELLAR_EMPIRE', 'CORPORATE_TERRITORIES', 'COLONIAL_ALLIANCE', 'PLANETARY_AUTONOMY', 'DECENTRALIZED_SPACE_COMMUNITIES'],
}

function addDependencyIssue(
  context: z.RefinementCtx,
  path: string,
  value: string,
  allowed: readonly string[] | undefined,
): void {
  if (value !== 'AUTO' && allowed && !allowed.includes(value)) {
    context.addIssue({ code: 'custom', path: [path], message: `${value} is incompatible with the selected world branch` })
  }
}

export const WorldKernelDraftSchema = RawWorldKernelDraftSchema.superRefine((kernel, context) => {
  if (kernel.family === 'MODERN_ANOMALY' && kernel.visibility !== 'AUTO') {
    addDependencyIssue(context, 'social_response', kernel.social_response, MODERN_ANOMALY_RESPONSES[kernel.visibility])
  }
  if (kernel.family === 'HISTORICAL' && kernel.era_profile !== 'AUTO') {
    addDependencyIssue(context, 'political_order', kernel.political_order, HISTORICAL_ORDERS[kernel.era_profile])
    if (!['EARLY_INDUSTRIAL', 'URBANIZING_MODERN'].includes(kernel.era_profile) && ['COLONIAL_CITY', 'INDUSTRIAL_CITY'].includes(kernel.stage)) {
      context.addIssue({ code: 'custom', path: ['stage'], message: 'This stage requires a modernizing historical era' })
    }
  }
  if (kernel.family === 'EASTERN_FANTASY' && kernel.fantasy_tradition === 'FOLKLORE_STRANGE' && ['MULTIPLE_REALMS', 'COSMIC_HIERARCHY'].includes(kernel.world_scope)) {
    context.addIssue({ code: 'custom', path: ['world_scope'], message: 'Folklore strange tales use a human-scale world' })
  }
  if (kernel.family === 'WESTERN_FANTASY' && kernel.magic_prevalence === 'MAGICAL_INFRASTRUCTURE' && !['AUTO', 'INDUSTRIAL_DAWN', 'MAGITECH_CIVILIZATION'].includes(kernel.technology_era)) {
    context.addIssue({ code: 'custom', path: ['magic_prevalence'], message: 'Magical infrastructure requires an industrial or magitech setting' })
  }
  if (kernel.family === 'SCIENCE_FICTION' && kernel.future_scale !== 'AUTO') {
    addDependencyIssue(context, 'stage', kernel.stage, SCIENCE_STAGES[kernel.future_scale])
    addDependencyIssue(context, 'authority', kernel.authority, SCIENCE_AUTHORITIES[kernel.future_scale])
  }
})

type WithoutAuto<T> = { [K in keyof T]: Exclude<T[K], 'AUTO'> }
export type ResolvedWorldKernel = WorldKernelDraft extends infer K
  ? K extends WorldKernelDraft ? WithoutAuto<K> : never
  : never

export const WorldFamilySchema = z.enum(WORLD_FAMILIES)
export const StoryThemeSchema = z.enum(STORY_THEMES)
export const StoryMoodSchema = z.enum(STORY_MOODS)

export type StoryTheme = z.infer<typeof StoryThemeSchema>
export type StoryMood = z.infer<typeof StoryMoodSchema>

export const WorldCreationDraftSchema = z.object({
  schema_version: z.literal(2),
  kernel: WorldKernelDraftSchema.nullable(),
  source_preset_id: z.string().max(80).nullable(),
  primary_theme: StoryThemeSchema.nullable(),
  secondary_theme: StoryThemeSchema.nullable(),
  mood: StoryMoodSchema,
  custom_requirements: z.string().trim().max(500),
  excluded_content: z.string().trim().max(500),
}).superRefine((draft, context) => {
  if (!draft.kernel) {
    context.addIssue({ code: 'custom', path: ['kernel'], message: 'A world family is required' })
  }
  if (!draft.primary_theme) {
    context.addIssue({ code: 'custom', path: ['primary_theme'], message: 'A primary story theme is required' })
  }
  if (draft.primary_theme && draft.secondary_theme === draft.primary_theme) {
    context.addIssue({ code: 'custom', path: ['secondary_theme'], message: 'The secondary theme must differ from the primary theme' })
  }
})

export type WorldCreationDraft = z.infer<typeof WorldCreationDraftSchema>

const ResolvedWorldKernelSchema = WorldKernelDraftSchema.superRefine((kernel, context) => {
  for (const [field, value] of Object.entries(kernel)) {
    if (value === 'AUTO') {
      context.addIssue({ code: 'custom', path: [field], message: 'Resolved world fields cannot be AUTO' })
    }
  }
}) as z.ZodType<ResolvedWorldKernel>

export const ResolvedWorldBriefSchema = z.object({
  schema_version: z.literal(2),
  kernel: ResolvedWorldKernelSchema,
  themes: z.array(StoryThemeSchema).min(1).max(2),
  mood: z.enum(STORY_MOODS.filter((item) => item !== 'AUTO') as [Exclude<StoryMood, 'AUTO'>, ...Array<Exclude<StoryMood, 'AUTO'>>]),
  custom_requirements: z.string().max(500),
  excluded_content: z.string().max(500),
  guidance: z.object({
    mode: z.enum(['OPEN', 'SUPPORTIVE', 'DIRECTED']),
    pressure: StoryPressureSchema,
    event_sources: z.array(z.string()).min(1),
  }),
})

export type ResolvedWorldBrief = z.infer<typeof ResolvedWorldBriefSchema>

/** Read-only compatibility for Genesis documents created by the v1 global-axis builder. */
export const LegacyResolvedWorldBriefSchema = z.object({
  schema_version: z.literal(1),
  civilization_stage: z.enum(['CLASSICAL', 'INDUSTRIAL', 'MODERN', 'NEAR_FUTURE', 'INTERSTELLAR', 'POST_COLLAPSE']),
  world_tradition: z.enum(['REALISTIC', 'HISTORICAL', 'WUXIA', 'WESTERN_FANTASY', 'URBAN_FANTASY', 'SCI_FI']),
  primary_stage: z.enum(['METROPOLIS', 'SMALL_TOWN', 'ACADEMY', 'COURT', 'SECT', 'FRONTIER', 'JOURNEY', 'STATION_COLONY', 'ISOLATED_SETTLEMENT']),
  social_form: z.enum(['EMPIRE', 'CITY_STATES', 'CLANS', 'SECTS', 'CORPORATIONS', 'COMMUNITY', 'DECENTRALIZED']),
  technology_level: z.enum(['HANDCRAFT', 'INDUSTRIAL', 'MODERN', 'ADVANCED', 'MIXED']),
  supernatural_boundary: z.enum(['NONE', 'RUMORED', 'PUBLIC']),
  themes: z.array(z.enum(['DAILY', 'RELATIONSHIP', 'GROWTH', 'ADVENTURE', 'MYSTERY', 'SURVIVAL', 'POLITICS', 'FOLKLORE'])).min(1).max(2),
  mood: z.enum(['WARM', 'BRIGHT', 'ROMANTIC', 'QUIET', 'COLD', 'SOMBER', 'DESOLATE', 'UNCANNY']),
  custom_requirements: z.string().max(500),
  excluded_content: z.string().max(500),
  guidance: z.object({
    mode: z.enum(['OPEN', 'SUPPORTIVE', 'DIRECTED']),
    pressure: StoryPressureSchema,
    event_sources: z.array(z.string()).min(1),
  }),
})

export const PersistedWorldBriefSchema = z.union([
  ResolvedWorldBriefSchema,
  LegacyResolvedWorldBriefSchema,
])

export interface WorldPresetDefinition {
  id: string
  label: string
  description: string
  draft: WorldCreationDraft
}

export interface WorldDetailQuestion {
  field: string
  options: readonly string[]
}

export interface WorldFamilyDefinition {
  family: WorldFamily
  questions: readonly WorldDetailQuestion[]
}

export interface WorldBuilderCatalog {
  families: readonly WorldFamilyDefinition[]
  themes: readonly StoryTheme[]
  moods: readonly StoryMood[]
}

export interface WorldBuilderConfig {
  schema_version: 2
  presets: WorldPresetDefinition[]
  catalogs: WorldBuilderCatalog
}
