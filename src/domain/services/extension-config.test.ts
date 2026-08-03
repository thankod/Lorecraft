import { describe, expect, it } from 'vitest'
import {
  STYLE_PRESETS,
  deriveNarrativeGuidanceMode,
} from './extension-config.js'

describe('story guidance configuration', () => {
  it('derives structure internally from story pressure', () => {
    expect(deriveNarrativeGuidanceMode('CALM')).toBe('OPEN')
    expect(deriveNarrativeGuidanceMode('GENTLE')).toBe('SUPPORTIVE')
    expect(deriveNarrativeGuidanceMode('ACTIVE')).toBe('DIRECTED')
    expect(deriveNarrativeGuidanceMode('INTENSE')).toBe('DIRECTED')
  })

  it('does not embed a protagonist in world presets', () => {
    expect(STYLE_PRESETS.every((preset) => preset.player_archetype === '')).toBe(true)
  })

  it('includes calm, everyday worlds', () => {
    const calmIds = STYLE_PRESETS
      .filter((preset) => preset.story_pressure === 'CALM')
      .map((preset) => preset.id)

    expect(calmIds).toEqual(expect.arrayContaining([
      'cozy_town',
      'culinary_life',
      'campus_youth',
    ]))
  })
})
