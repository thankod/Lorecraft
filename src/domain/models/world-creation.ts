import { z } from 'zod/v4'
import { StoryPressureSchema } from './story.js'

export const QUICK_WORLD_ARCHETYPES = [
  'MODERN',
  'HISTORICAL',
  'WESTERN_FANTASY',
  'WUXIA',
  'SCI_FI',
  'POST_APOCALYPSE',
] as const

export const CIVILIZATION_STAGES = [
  'AUTO',
  'CLASSICAL',
  'INDUSTRIAL',
  'MODERN',
  'NEAR_FUTURE',
  'INTERSTELLAR',
  'POST_COLLAPSE',
] as const

export const WORLD_TRADITIONS = [
  'AUTO',
  'REALISTIC',
  'HISTORICAL',
  'WUXIA',
  'WESTERN_FANTASY',
  'URBAN_FANTASY',
  'SCI_FI',
] as const

export const PRIMARY_STAGES = [
  'AUTO',
  'METROPOLIS',
  'SMALL_TOWN',
  'ACADEMY',
  'COURT',
  'SECT',
  'FRONTIER',
  'JOURNEY',
  'STATION_COLONY',
  'ISOLATED_SETTLEMENT',
] as const

export const SOCIAL_FORMS = [
  'AUTO',
  'EMPIRE',
  'CITY_STATES',
  'CLANS',
  'SECTS',
  'CORPORATIONS',
  'COMMUNITY',
  'DECENTRALIZED',
] as const

export const TECHNOLOGY_LEVELS = [
  'AUTO',
  'HANDCRAFT',
  'INDUSTRIAL',
  'MODERN',
  'ADVANCED',
  'MIXED',
] as const

export const SUPERNATURAL_BOUNDARIES = [
  'AUTO',
  'NONE',
  'RUMORED',
  'PUBLIC',
] as const

export const STORY_THEMES = [
  'DAILY',
  'RELATIONSHIP',
  'GROWTH',
  'ADVENTURE',
  'MYSTERY',
  'SURVIVAL',
  'POLITICS',
  'FOLKLORE',
] as const

export const STORY_MOODS = [
  'AUTO',
  'WARM',
  'BRIGHT',
  'ROMANTIC',
  'QUIET',
  'COLD',
  'SOMBER',
  'DESOLATE',
  'UNCANNY',
] as const

export const QuickWorldArchetypeSchema = z.enum(QUICK_WORLD_ARCHETYPES)
export const CivilizationStageSchema = z.enum(CIVILIZATION_STAGES)
export const WorldTraditionSchema = z.enum(WORLD_TRADITIONS)
export const PrimaryStageSchema = z.enum(PRIMARY_STAGES)
export const SocialFormSchema = z.enum(SOCIAL_FORMS)
export const TechnologyLevelSchema = z.enum(TECHNOLOGY_LEVELS)
export const SupernaturalBoundarySchema = z.enum(SUPERNATURAL_BOUNDARIES)
export const StoryThemeSchema = z.enum(STORY_THEMES)
export const StoryMoodSchema = z.enum(STORY_MOODS)

export type QuickWorldArchetype = z.infer<typeof QuickWorldArchetypeSchema>
export type CivilizationStage = z.infer<typeof CivilizationStageSchema>
export type WorldTradition = z.infer<typeof WorldTraditionSchema>
export type PrimaryStage = z.infer<typeof PrimaryStageSchema>
export type SocialForm = z.infer<typeof SocialFormSchema>
export type TechnologyLevel = z.infer<typeof TechnologyLevelSchema>
export type SupernaturalBoundary = z.infer<typeof SupernaturalBoundarySchema>
export type StoryTheme = z.infer<typeof StoryThemeSchema>
export type StoryMood = z.infer<typeof StoryMoodSchema>

export const WorldCreationDraftSchema = z.object({
  schema_version: z.literal(1),
  base_archetype: QuickWorldArchetypeSchema.nullable(),
  source_preset_id: z.string().max(80).nullable(),
  civilization_stage: CivilizationStageSchema,
  world_tradition: WorldTraditionSchema,
  primary_stage: PrimaryStageSchema,
  social_form: SocialFormSchema,
  technology_level: TechnologyLevelSchema,
  supernatural_boundary: SupernaturalBoundarySchema,
  primary_theme: StoryThemeSchema.nullable(),
  secondary_theme: StoryThemeSchema.nullable(),
  mood: StoryMoodSchema,
  custom_requirements: z.string().trim().max(500),
  excluded_content: z.string().trim().max(500),
}).superRefine((draft, context) => {
  if (!draft.base_archetype) {
    context.addIssue({
      code: 'custom',
      path: ['base_archetype'],
      message: 'A world archetype is required',
    })
  }
  if (!draft.primary_theme) {
    context.addIssue({
      code: 'custom',
      path: ['primary_theme'],
      message: 'A primary story theme is required',
    })
  }
  if (draft.primary_theme && draft.secondary_theme === draft.primary_theme) {
    context.addIssue({
      code: 'custom',
      path: ['secondary_theme'],
      message: 'The secondary theme must differ from the primary theme',
    })
  }
})

export type WorldCreationDraft = z.infer<typeof WorldCreationDraftSchema>

const ResolvedCivilizationStageSchema = z.enum([
  'CLASSICAL',
  'INDUSTRIAL',
  'MODERN',
  'NEAR_FUTURE',
  'INTERSTELLAR',
  'POST_COLLAPSE',
])

const ResolvedWorldTraditionSchema = z.enum([
  'REALISTIC',
  'HISTORICAL',
  'WUXIA',
  'WESTERN_FANTASY',
  'URBAN_FANTASY',
  'SCI_FI',
])

const ResolvedPrimaryStageSchema = z.enum(PRIMARY_STAGES.filter((item) => item !== 'AUTO') as [Exclude<PrimaryStage, 'AUTO'>, ...Array<Exclude<PrimaryStage, 'AUTO'>>])
const ResolvedSocialFormSchema = z.enum(SOCIAL_FORMS.filter((item) => item !== 'AUTO') as [Exclude<SocialForm, 'AUTO'>, ...Array<Exclude<SocialForm, 'AUTO'>>])
const ResolvedTechnologyLevelSchema = z.enum(TECHNOLOGY_LEVELS.filter((item) => item !== 'AUTO') as [Exclude<TechnologyLevel, 'AUTO'>, ...Array<Exclude<TechnologyLevel, 'AUTO'>>])
const ResolvedSupernaturalBoundarySchema = z.enum(['NONE', 'RUMORED', 'PUBLIC'])
const ResolvedStoryMoodSchema = z.enum(STORY_MOODS.filter((item) => item !== 'AUTO') as [Exclude<StoryMood, 'AUTO'>, ...Array<Exclude<StoryMood, 'AUTO'>>])

export const ResolvedWorldBriefSchema = z.object({
  schema_version: z.literal(1),
  civilization_stage: ResolvedCivilizationStageSchema,
  world_tradition: ResolvedWorldTraditionSchema,
  primary_stage: ResolvedPrimaryStageSchema,
  social_form: ResolvedSocialFormSchema,
  technology_level: ResolvedTechnologyLevelSchema,
  supernatural_boundary: ResolvedSupernaturalBoundarySchema,
  themes: z.array(StoryThemeSchema).min(1).max(2),
  mood: ResolvedStoryMoodSchema,
  custom_requirements: z.string().max(500),
  excluded_content: z.string().max(500),
  guidance: z.object({
    mode: z.enum(['OPEN', 'SUPPORTIVE', 'DIRECTED']),
    pressure: StoryPressureSchema,
    event_sources: z.array(z.string()).min(1),
  }),
})

export type ResolvedWorldBrief = z.infer<typeof ResolvedWorldBriefSchema>

export interface WorldPresetDefinition {
  id: string
  label: string
  description: string
  draft: WorldCreationDraft
}

export interface WorldBuilderCatalog {
  quick_archetypes: readonly QuickWorldArchetype[]
  civilization_stages: readonly CivilizationStage[]
  world_traditions: readonly WorldTradition[]
  primary_stages: readonly PrimaryStage[]
  social_forms: readonly SocialForm[]
  technology_levels: readonly TechnologyLevel[]
  supernatural_boundaries: readonly SupernaturalBoundary[]
  themes: readonly StoryTheme[]
  moods: readonly StoryMood[]
}

export interface WorldBuilderConfig {
  schema_version: 1
  presets: WorldPresetDefinition[]
  catalogs: WorldBuilderCatalog
}
