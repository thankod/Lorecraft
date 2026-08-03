import { useMemo, useState } from 'react'
import type {
  StoryMood,
  StoryTheme,
  WorldCreationDraft,
} from '@engine/domain/models/world-creation'
import { WorldCreationDraftSchema } from '@engine/domain/models/world-creation'
import {
  applyQuickWorldArchetype,
  applyWorldPreset,
  createEmptyWorldDraft,
  isDraftBasedOnPreset,
  resolveWorldCreationDraft,
} from '@engine/domain/services/world-creation'
import { useGameStore } from '../stores/useGameStore'
import { useT } from '../i18n'
import './StyleSelectOverlay.css'

type BuilderMode = 'quick' | 'detailed'

const DETAIL_FIELDS = [
  'civilization_stage',
  'world_tradition',
  'primary_stage',
  'social_form',
  'technology_level',
  'supernatural_boundary',
] as const

export function StyleSelectOverlay() {
  const t = useT()
  const tc = useT('config')
  const config = useGameStore((state) => state.worldBuilderConfig)
  const send = useGameStore((state) => state.send)
  const [mode, setMode] = useState<BuilderMode>('quick')
  const [draft, setDraft] = useState<WorldCreationDraft>(() => createEmptyWorldDraft())
  const [undoDraft, setUndoDraft] = useState<WorldCreationDraft | null>(null)

  const resolved = useMemo(() => {
    const result = WorldCreationDraftSchema.safeParse(draft)
    return result.success ? resolveWorldCreationDraft(result.data) : null
  }, [draft])

  if (!config) return null

  const sourcePreset = draft.source_preset_id
    ? config.presets.find((preset) => preset.id === draft.source_preset_id) ?? null
    : null
  const exactPreset = sourcePreset ? isDraftBasedOnPreset(draft, sourcePreset) : false

  function label(value: string): string {
    return t(`worldBuilder.option.${value}`, { defaultValue: value }) as string
  }

  function rememberAndSet(next: WorldCreationDraft) {
    setUndoDraft(draft)
    setDraft(next)
  }

  function choosePreset(index: number) {
    const preset = config!.presets[index]
    if (preset) rememberAndSet(applyWorldPreset(draft, preset))
  }

  function chooseArchetype(archetype: WorldCreationDraft['base_archetype']) {
    if (!archetype || archetype === draft.base_archetype) return
    rememberAndSet(applyQuickWorldArchetype(draft, archetype))
  }

  function updateField<K extends keyof WorldCreationDraft>(key: K, value: WorldCreationDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function toggleTheme(theme: StoryTheme) {
    setDraft((current) => {
      if (current.primary_theme === theme) {
        return {
          ...current,
          primary_theme: current.secondary_theme,
          secondary_theme: null,
        }
      }
      if (current.secondary_theme === theme) {
        return { ...current, secondary_theme: null }
      }
      if (!current.primary_theme) return { ...current, primary_theme: theme }
      if (!current.secondary_theme) return { ...current, secondary_theme: theme }
      return { ...current, secondary_theme: theme }
    })
  }

  function chooseMood(mood: StoryMood) {
    updateField('mood', mood)
  }

  function continueToCharacter() {
    const parsed = WorldCreationDraftSchema.safeParse(draft)
    if (!parsed.success) return
    send({ type: 'select_world', draft: parsed.data })
    useGameStore.getState().setWorldBuilderConfig(null)
  }

  const previewTitle = resolved
    ? t('worldBuilder.previewTitle', {
        tradition: label(resolved.world_tradition),
        stage: label(resolved.primary_stage),
      })
    : t('worldBuilder.previewEmptyTitle')
  const previewThemes = resolved
    ? resolved.themes.map(label).join(t('worldBuilder.joiner') as string)
    : t('worldBuilder.previewEmptyThemes')

  return (
    <div className="style-overlay">
      <main className="world-builder" role="dialog" aria-modal="true" aria-labelledby="world-builder-title">
        <header className="world-builder-header">
          <div>
            <div className="creation-progress" aria-label={t('creation.progressLabel')}>
              <span className="active">01 {t('creation.worldStep')}</span>
              <span>02 {t('creation.characterStep')}</span>
              <span>03 {t('creation.attributesStep')}</span>
            </div>
            <h2 id="world-builder-title">{t('worldBuilder.title')}</h2>
            <p>{t('worldBuilder.subtitle')}</p>
          </div>
          <button
            className="world-builder-close"
            onClick={() => useGameStore.getState().setWorldBuilderConfig(null)}
            aria-label={t('worldBuilder.close')}
          >&#10005;</button>
        </header>

        <div className="preset-shelf" aria-label={t('worldBuilder.presets')}>
          <div className="preset-shelf-label">
            <span>{t('worldBuilder.presets')}</span>
            <small>{t('worldBuilder.presetsHint')}</small>
          </div>
          <div className="preset-scroll">
            {config.presets.map((preset, index) => (
              <button
                type="button"
                key={preset.id}
                className={sourcePreset?.id === preset.id ? 'selected' : ''}
                onClick={() => choosePreset(index)}
              >
                <span>{tc(`preset.${preset.id}.label`, { defaultValue: preset.label })}</span>
                <small>{tc(`preset.${preset.id}.description`, { defaultValue: preset.description })}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="builder-mode-tabs" role="tablist" aria-label={t('worldBuilder.modeLabel')}>
          <button type="button" role="tab" aria-selected={mode === 'quick'} className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}>
            <span>{t('worldBuilder.quick')}</span>
            <small>{t('worldBuilder.quickHint')}</small>
          </button>
          <button type="button" role="tab" aria-selected={mode === 'detailed'} className={mode === 'detailed' ? 'active' : ''} onClick={() => setMode('detailed')}>
            <span>{t('worldBuilder.detailed')}</span>
            <small>{t('worldBuilder.detailedHint')}</small>
          </button>
        </div>

        <div className="world-builder-body">
          <section className="world-controls" key={mode}>
            <fieldset className="builder-section archetype-section">
              <legend><b>01</b>{t('worldBuilder.archetype')}</legend>
              <p>{t('worldBuilder.archetypeHint')}</p>
              <div className="archetype-grid">
                {config.catalogs.quick_archetypes.map((archetype) => (
                  <button
                    type="button"
                    key={archetype}
                    className={draft.base_archetype === archetype ? 'selected' : ''}
                    onClick={() => chooseArchetype(archetype)}
                  >
                    <i aria-hidden="true" />
                    <span>{label(archetype)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === 'detailed' && (
              <fieldset className="builder-section detail-section">
                <legend><b>02</b>{t('worldBuilder.worldDetails')}</legend>
                <p>{t('worldBuilder.worldDetailsHint')}</p>
                <div className="detail-selects">
                  {DETAIL_FIELDS.map((field) => (
                    <label key={field}>
                      <span>{t(`worldBuilder.field.${field}`)}</span>
                      <select
                        value={draft[field]}
                        onChange={(event) => updateField(field, event.target.value as WorldCreationDraft[typeof field])}
                      >
                        {config.catalogs[
                          field === 'civilization_stage' ? 'civilization_stages'
                            : field === 'world_tradition' ? 'world_traditions'
                              : field === 'primary_stage' ? 'primary_stages'
                                : field === 'social_form' ? 'social_forms'
                                  : field === 'technology_level' ? 'technology_levels'
                                    : 'supernatural_boundaries'
                        ].map((option) => <option key={option} value={option}>{label(option)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="builder-section theme-section">
              <legend><b>{mode === 'quick' ? '02' : '03'}</b>{t('worldBuilder.themes')}</legend>
              <p>{t('worldBuilder.themesHint')}</p>
              <div className="theme-cloud">
                {config.catalogs.themes.map((theme) => {
                  const order = draft.primary_theme === theme ? 1 : draft.secondary_theme === theme ? 2 : null
                  return (
                    <button type="button" key={theme} className={order ? 'selected' : ''} onClick={() => toggleTheme(theme)}>
                      {order && <b>{order}</b>}
                      <span>{label(theme)}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="builder-section mood-section">
              <legend><b>{mode === 'quick' ? '03' : '04'}</b>{t('worldBuilder.mood')}</legend>
              <p>{t('worldBuilder.moodHint')}</p>
              <div className="mood-line">
                {config.catalogs.moods.map((mood) => (
                  <button type="button" key={mood} className={draft.mood === mood ? 'selected' : ''} onClick={() => chooseMood(mood)}>
                    {label(mood)}
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === 'detailed' && (
              <fieldset className="builder-section free-text-section">
                <legend><b>05</b>{t('worldBuilder.finalTouches')}</legend>
                <p>{t('worldBuilder.finalTouchesHint')}</p>
                <label>
                  <span>{t('worldBuilder.customRequirements')}</span>
                  <textarea maxLength={500} rows={3} value={draft.custom_requirements} onChange={(event) => updateField('custom_requirements', event.target.value)} placeholder={t('worldBuilder.customPlaceholder')} />
                </label>
                <label>
                  <span>{t('worldBuilder.excludedContent')}</span>
                  <textarea maxLength={500} rows={2} value={draft.excluded_content} onChange={(event) => updateField('excluded_content', event.target.value)} placeholder={t('worldBuilder.excludedPlaceholder')} />
                </label>
              </fieldset>
            )}
          </section>

          <aside className="world-live-page" aria-live="polite">
            <span className="live-page-kicker">{t('worldBuilder.livePreview')}</span>
            <div className="live-page-rule" />
            <h3>{previewTitle}</h3>
            <p className="live-page-deck">{previewThemes}</p>
            {resolved ? (
              <dl>
                <div><dt>{t('worldBuilder.field.civilization_stage')}</dt><dd>{label(resolved.civilization_stage)}</dd></div>
                <div><dt>{t('worldBuilder.field.social_form')}</dt><dd>{label(resolved.social_form)}</dd></div>
                <div><dt>{t('worldBuilder.field.technology_level')}</dt><dd>{label(resolved.technology_level)}</dd></div>
                <div><dt>{t('worldBuilder.field.supernatural_boundary')}</dt><dd>{label(resolved.supernatural_boundary)}</dd></div>
                <div><dt>{t('worldBuilder.mood')}</dt><dd>{label(resolved.mood)}</dd></div>
              </dl>
            ) : (
              <p className="live-page-empty">{t('worldBuilder.previewHint')}</p>
            )}
            {(draft.custom_requirements || draft.excluded_content) && (
              <div className="live-page-notes">
                {draft.custom_requirements && <p><b>{t('worldBuilder.customRequirements')}</b>{draft.custom_requirements}</p>}
                {draft.excluded_content && <p><b>{t('worldBuilder.excludedContent')}</b>{draft.excluded_content}</p>}
              </div>
            )}
            <footer>
              {sourcePreset && (
                <span>{exactPreset ? t('worldBuilder.presetApplied', { name: tc(`preset.${sourcePreset.id}.label`, { defaultValue: sourcePreset.label }) }) : t('worldBuilder.presetModified', { name: tc(`preset.${sourcePreset.id}.label`, { defaultValue: sourcePreset.label }) })}</span>
              )}
              {undoDraft && <button type="button" onClick={() => { setDraft(undoDraft); setUndoDraft(null) }}>{t('worldBuilder.undo')}</button>}
            </footer>
          </aside>
        </div>

        <footer className="world-builder-footer">
          <span>{resolved ? t('worldBuilder.characterSeparate') : t('worldBuilder.requiredHint')}</span>
          <button type="button" disabled={!resolved} onClick={continueToCharacter}>{t('worldBuilder.continue')}</button>
        </footer>
      </main>
    </div>
  )
}
