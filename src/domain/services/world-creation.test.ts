import { describe, expect, it } from 'vitest'
import {
  WORLD_PRESETS,
  applyQuickWorldArchetype,
  applyWorldPreset,
  createEmptyWorldDraft,
  isDraftBasedOnPreset,
  resolveWorldCreationDraft,
  worldBriefToStyleConfig,
} from './world-creation.js'

describe('world creation resolver', () => {
  it('resolves AUTO fields deterministically from the quick archetype', () => {
    const draft = applyQuickWorldArchetype(createEmptyWorldDraft(), 'WUXIA')
    draft.primary_theme = 'DAILY'

    const first = resolveWorldCreationDraft(draft)
    const second = resolveWorldCreationDraft(draft)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      civilization_stage: 'CLASSICAL',
      world_tradition: 'WUXIA',
      primary_stage: 'SECT',
      social_form: 'SECTS',
      technology_level: 'HANDCRAFT',
      supernatural_boundary: 'RUMORED',
      themes: ['DAILY'],
      guidance: {
        mode: 'OPEN',
        pressure: 'CALM',
      },
    })
  })

  it('preserves the ordered primary and secondary themes', () => {
    const preset = WORLD_PRESETS.find((item) => item.id === 'space_scifi')!
    const brief = resolveWorldCreationDraft(preset.draft)

    expect(brief.themes).toEqual(['ADVENTURE', 'POLITICS'])
    expect(brief.guidance.event_sources).toEqual(['DISCOVERY', 'TRAVEL', 'OBSTACLES'])
  })

  it('applies presets while preserving the personal exclusion list', () => {
    const draft = {
      ...createEmptyWorldDraft(),
      excluded_content: '不要蜘蛛',
      custom_requirements: '旧的要求',
    }
    const preset = WORLD_PRESETS.find((item) => item.id === 'cozy_town')!
    const next = applyWorldPreset(draft, preset)

    expect(next.excluded_content).toBe('不要蜘蛛')
    expect(next.custom_requirements).toBe('')
    expect(next.source_preset_id).toBe('cozy_town')
    expect(isDraftBasedOnPreset(next, preset)).toBe(true)
  })

  it('changes macro fields without erasing theme or free text', () => {
    const initial = {
      ...WORLD_PRESETS[0].draft,
      custom_requirements: '多一些雨天',
      excluded_content: '不要末日',
    }
    const next = applyQuickWorldArchetype(initial, 'WESTERN_FANTASY')

    expect(next.base_archetype).toBe('WESTERN_FANTASY')
    expect(next.primary_theme).toBe(initial.primary_theme)
    expect(next.custom_requirements).toBe('多一些雨天')
    expect(next.excluded_content).toBe('不要末日')
    expect(next.source_preset_id).toBeNull()
  })

  it('keeps character identity out of the resolved world brief', () => {
    const brief = resolveWorldCreationDraft(WORLD_PRESETS[0].draft)
    const serialized = JSON.stringify(brief)

    expect(serialized).not.toContain('gender')
    expect(serialized).not.toContain('player')
    expect(serialized).not.toContain('attributes')
  })

  it('adapts the brief to legacy runtime guidance without losing the source brief', () => {
    const brief = resolveWorldCreationDraft(
      WORLD_PRESETS.find((item) => item.id === 'cozy_town')!.draft,
    )
    const style = worldBriefToStyleConfig(brief)

    expect(style.story_pressure).toBe('CALM')
    expect(style.story_drivers).toEqual(['RELATIONSHIP', 'GROWTH'])
    expect(style.world_brief).toEqual(brief)
  })
})
