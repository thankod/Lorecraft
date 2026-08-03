import { z } from 'zod/v4'

export const PlayerGenderSchema = z.enum(['MALE', 'FEMALE'])
export type PlayerGender = z.infer<typeof PlayerGenderSchema>

export const PlayerProfileInputSchema = z.object({
  gender: PlayerGenderSchema,
  name: z.string().trim().max(40).optional().default(''),
  age: z.string().trim().max(40).optional().default(''),
  role: z.string().trim().max(120).optional().default(''),
  background_seed: z.string().trim().max(500).optional().default(''),
})

export type PlayerProfileInput = z.input<typeof PlayerProfileInputSchema>
