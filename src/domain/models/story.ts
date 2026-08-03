import { z } from 'zod/v4'

export const STORY_DRIVERS = [
  'RELATIONSHIP',
  'EXPLORATION',
  'GROWTH',
  'MYSTERY',
  'SURVIVAL',
] as const

export const StoryDriverSchema = z.enum(STORY_DRIVERS)
export type StoryDriver = z.infer<typeof StoryDriverSchema>

export const STORY_PRESSURES = ['CALM', 'GENTLE', 'ACTIVE', 'INTENSE'] as const
export const StoryPressureSchema = z.enum(STORY_PRESSURES)
export type StoryPressure = z.infer<typeof StoryPressureSchema>
