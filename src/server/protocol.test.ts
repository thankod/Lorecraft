import { describe, expect, it } from 'vitest'
import { ClientMessageSchema } from './protocol.js'
import { WORLD_PRESETS } from '../domain/services/world-creation.js'

const attributes = {
  strength: 50,
  constitution: 50,
  agility: 50,
  intelligence: 50,
  perception: 50,
  willpower: 50,
  charisma: 50,
  luck: 50,
}

describe('character creation protocol', () => {
  it.each(['MALE', 'FEMALE'] as const)('accepts the binary gender %s', (gender) => {
    const result = ClientMessageSchema.safeParse({
      type: 'confirm_attributes',
      attributes,
      profile: { gender },
    })

    expect(result.success).toBe(true)
  })

  it.each([
    undefined,
    'NON_BINARY',
    'male',
    '',
  ])('rejects an unsupported or missing gender (%s)', (gender) => {
    const result = ClientMessageSchema.safeParse({
      type: 'confirm_attributes',
      attributes,
      profile: gender === undefined ? {} : { gender },
    })

    expect(result.success).toBe(false)
  })
})

describe('world builder protocol', () => {
  it('accepts a complete structured world draft', () => {
    expect(ClientMessageSchema.safeParse({
      type: 'select_world',
      draft: WORLD_PRESETS[0].draft,
    }).success).toBe(true)
  })

  it('rejects a draft without a world type or primary theme', () => {
    expect(ClientMessageSchema.safeParse({
      type: 'select_world',
      draft: {
        ...WORLD_PRESETS[0].draft,
        base_archetype: null,
        primary_theme: null,
      },
    }).success).toBe(false)
  })
})
