import { z } from 'zod/v4'

// ============================================================
// Game Time
// ============================================================

export const GameTimestampSchema = z.object({
  day: z.number().int().nonnegative(),
  hour: z.number().int().min(0).max(23),
  turn: z.number().int().nonnegative(),
})

export type GameTimestamp = z.infer<typeof GameTimestampSchema>

export const GameTimeSchema = z.object({
  current: GameTimestampSchema,
  total_turns: z.number().int().nonnegative(),
})

export type GameTime = z.infer<typeof GameTimeSchema>

// ============================================================
// Shared Enums
// ============================================================

export const EventWeight = z.enum(['PRIVATE', 'MINOR', 'SIGNIFICANT', 'MAJOR'])
export type EventWeight = z.infer<typeof EventWeight>

export const EventTag = z.enum([
  'DIALOGUE',
  'CONFLICT',
  'DISCOVERY',
  'RELATIONSHIP_CHANGE',
  'LOCATION_CHANGE',
  'ITEM_TRANSFER',
  'NPC_ACTION',
  'WORLD_CHANGE',
  'INFERRED',
])
export type EventTag = z.infer<typeof EventTag>

export const NPCTier = z.enum(['A', 'B', 'C'])
export type NPCTier = z.infer<typeof NPCTier>

export const Accessibility = z.enum(['OPEN', 'RESTRICTED', 'LOCKED', 'DESTROYED'])
export type Accessibility = z.infer<typeof Accessibility>

export const TraversalCondition = z.enum(['OPEN', 'REQUIRES_KEY', 'REQUIRES_EVENT', 'BLOCKED'])
export type TraversalCondition = z.infer<typeof TraversalCondition>

export const FactionStrength = z.enum(['WEAK', 'MODERATE', 'STRONG', 'DOMINANT'])
export type FactionStrength = z.infer<typeof FactionStrength>

export const FactionRelationType = z.enum(['ALLIED', 'NEUTRAL', 'HOSTILE', 'UNKNOWN'])
export type FactionRelationType = z.infer<typeof FactionRelationType>

export const TraitType = z.enum(['EXPRESSION', 'VALUE'])
export type TraitType = z.infer<typeof TraitType>

export const TraitStatus = z.enum(['SILENT', 'EMERGING', 'ACTIVE', 'FADING'])
export type TraitStatus = z.infer<typeof TraitStatus>

export const DistortionType = z.enum(['NONE', 'INFO_GAP', 'INTENT_MISREAD', 'EMOTIONAL_DISTORTION'])
export type DistortionType = z.infer<typeof DistortionType>

export const GoalStatus = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'])
export type GoalStatus = z.infer<typeof GoalStatus>

export const LoreAuthorityLevel = z.enum(['AUTHOR_PRESET', 'AI_CANONICALIZED'])
export type LoreAuthorityLevel = z.infer<typeof LoreAuthorityLevel>

export const LoreFactType = z.enum(['NPC_PERSONAL', 'WORLD', 'RELATIONSHIP', 'ORGANIZATION'])
export type LoreFactType = z.infer<typeof LoreFactType>
