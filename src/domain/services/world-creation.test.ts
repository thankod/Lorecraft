import { describe, expect, it } from 'vitest'
import { PersistedWorldBriefSchema, WorldCreationDraftSchema } from '../models/world-creation.js'
import {
  WORLD_PRESETS,
  applyWorldFamily,
  applyWorldPreset,
  createEmptyWorldDraft,
  getAvailableWorldDetailOptions,
  isDraftBasedOnPreset,
  resolveWorldCreationDraft,
  updateWorldKernelField,
  worldBriefToStyleConfig,
} from './world-creation.js'

describe('world creation resolver', () => {
  it('resolves AUTO fields deterministically inside the selected world family', () => {
    const draft = applyWorldFamily(createEmptyWorldDraft(), 'WUXIA')
    draft.primary_theme = 'DAILY'

    const first = resolveWorldCreationDraft(draft)
    const second = resolveWorldCreationDraft(draft)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      schema_version: 2,
      kernel: {
        family: 'WUXIA',
        era_context: 'TIMELESS_JIANGHU',
        stage: 'ROAMING_JIANGHU',
        jianghu_order: 'SECT_ALLIANCE',
        martial_ceiling: 'INNER_FORCE',
      },
      themes: ['DAILY'],
      guidance: { mode: 'OPEN', pressure: 'CALM' },
    })
  })

  it('keeps space stations and corporate sovereignty inside coherent science-fiction scales', () => {
    let draft = applyWorldFamily(createEmptyWorldDraft(), 'SCIENCE_FICTION')
    draft.primary_theme = 'ADVENTURE'
    draft.kernel = updateWorldKernelField(draft.kernel!, 'future_scale', 'NEAR_FUTURE_EARTH')

    expect(getAvailableWorldDetailOptions(draft.kernel!, 'stage')).toContain('ORBITAL_STATION')
    expect(getAvailableWorldDetailOptions(draft.kernel!, 'stage')).not.toContain('GIANT_STATION')
    expect(getAvailableWorldDetailOptions(draft.kernel!, 'authority')).toContain('TECH_GIANTS')
    expect(getAvailableWorldDetailOptions(draft.kernel!, 'authority')).not.toContain('CORPORATE_TERRITORIES')

    const malformed = {
      ...draft,
      kernel: { ...draft.kernel, stage: 'GIANT_STATION', authority: 'CORPORATE_TERRITORIES' },
    }
    expect(WorldCreationDraftSchema.safeParse(malformed).success).toBe(false)
  })

  it('resets dependent answers when a parent branch changes', () => {
    const preset = WORLD_PRESETS.find((item) => item.id === 'space_voyage')!
    const changed = updateWorldKernelField(preset.draft.kernel!, 'future_scale', 'NEAR_FUTURE_EARTH')

    expect(changed).toMatchObject({
      family: 'SCIENCE_FICTION',
      future_scale: 'NEAR_FUTURE_EARTH',
      stage: 'AUTO',
      authority: 'AUTO',
    })
  })

  it('preserves ordered primary and secondary themes', () => {
    const preset = WORLD_PRESETS.find((item) => item.id === 'space_voyage')!
    const brief = resolveWorldCreationDraft(preset.draft)

    expect(brief.themes).toEqual(['ADVENTURE', 'CIVILIZATION'])
    expect(brief.guidance.event_sources).toEqual(['DISCOVERY', 'TRAVEL', 'OBSTACLES'])
  })

  it('applies presets while preserving the personal exclusion list', () => {
    const draft = { ...createEmptyWorldDraft(), excluded_content: '不要蜘蛛', custom_requirements: '旧的要求' }
    const preset = WORLD_PRESETS.find((item) => item.id === 'cozy_town')!
    const next = applyWorldPreset(draft, preset)

    expect(next.excluded_content).toBe('不要蜘蛛')
    expect(next.custom_requirements).toBe('')
    expect(next.source_preset_id).toBe('cozy_town')
    expect(isDraftBasedOnPreset(next, preset)).toBe(true)
  })

  it('changes the world family without erasing themes or free text', () => {
    const initial = { ...WORLD_PRESETS[0].draft, custom_requirements: '多一些雨天', excluded_content: '不要末日' }
    const next = applyWorldFamily(initial, 'WESTERN_FANTASY')

    expect(next.kernel?.family).toBe('WESTERN_FANTASY')
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

  it('adapts the brief to runtime guidance without losing the source brief', () => {
    const brief = resolveWorldCreationDraft(WORLD_PRESETS.find((item) => item.id === 'cozy_town')!.draft)
    const style = worldBriefToStyleConfig(brief)

    expect(style.story_pressure).toBe('CALM')
    expect(style.story_drivers).toEqual(['RELATIONSHIP', 'GROWTH'])
    expect(style.world_brief).toEqual(brief)
  })

  it('keeps v1 creation briefs readable in existing Genesis documents', () => {
    expect(PersistedWorldBriefSchema.safeParse({
      schema_version: 1,
      civilization_stage: 'MODERN',
      world_tradition: 'REALISTIC',
      primary_stage: 'SMALL_TOWN',
      social_form: 'COMMUNITY',
      technology_level: 'MODERN',
      supernatural_boundary: 'NONE',
      themes: ['DAILY'],
      mood: 'WARM',
      custom_requirements: '',
      excluded_content: '',
      guidance: { mode: 'OPEN', pressure: 'CALM', event_sources: ['ROUTINE'] },
    }).success).toBe(true)
  })
})
