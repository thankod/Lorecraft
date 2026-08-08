import { useMemo, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import type {
  StoryMood,
  StoryTheme,
  WorldCreationDraft,
  WorldFamily,
  WorldKernelDraft,
} from '@engine/domain/models/world-creation'
import { WorldCreationDraftSchema } from '@engine/domain/models/world-creation'
import {
  applyWorldFamily,
  applyWorldPreset,
  createEmptyWorldDraft,
  getAvailableWorldDetailOptions,
  isDraftBasedOnPreset,
  resolveWorldCreationDraft,
  updateWorldKernelField,
} from '@engine/domain/services/world-creation'
import { useGameStore } from '../stores/useGameStore'
import { useT } from '../i18n'
import { AutoHideScrollArea } from './AutoHideScrollArea'
import './CreationFlow.css'
import './StyleSelectOverlay.css'

type BuilderMode = 'quick' | 'detailed'

const FAMILY_MARKS: Record<WorldFamily, string> = {
  CONTEMPORARY: '今',
  MODERN_ANOMALY: '异',
  HISTORICAL: '史',
  WUXIA: '侠',
  EASTERN_FANTASY: '玄',
  WESTERN_FANTASY: '幻',
  SCIENCE_FICTION: '星',
  POST_COLLAPSE: '余',
}

function kernelValue(kernel: WorldKernelDraft, field: string): string {
  return (kernel as unknown as Record<string, string>)[field] ?? 'AUTO'
}

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

  const previewResolved = useMemo(() => {
    if (!draft.kernel) return null
    const result = WorldCreationDraftSchema.safeParse({
      ...draft,
      primary_theme: draft.primary_theme ?? 'DAILY',
    })
    return result.success ? resolveWorldCreationDraft(result.data) : null
  }, [draft])

  if (!config) return null

  const selectedFamily = draft.kernel?.family ?? null
  const familyDefinition = selectedFamily
    ? config.catalogs.families.find((definition) => definition.family === selectedFamily) ?? null
    : null
  const sourcePreset = draft.source_preset_id
    ? config.presets.find((preset) => preset.id === draft.source_preset_id) ?? null
    : null
  const exactPreset = sourcePreset ? isDraftBasedOnPreset(draft, sourcePreset) : false

  function label(value: string): string {
    const fallback = value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    return t(`worldBuilder.option.${value}`, { defaultValue: fallback }) as string
  }

  function fieldLabel(field: string): string {
    const fallback = field
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    return t(`worldBuilder.field.${field}`, { defaultValue: fallback }) as string
  }

  function familyHint(family: WorldFamily): string {
    return t(`worldBuilder.familyHint.${family}`, { defaultValue: '' }) as string
  }

  function rememberAndSet(next: WorldCreationDraft) {
    setUndoDraft(draft)
    setDraft(next)
  }

  function choosePreset(index: number) {
    const preset = config!.presets[index]
    if (preset) rememberAndSet(applyWorldPreset(draft, preset))
  }

  function chooseFamily(family: WorldFamily) {
    if (family === selectedFamily) return
    rememberAndSet(applyWorldFamily(draft, family))
  }

  function updateField<K extends keyof WorldCreationDraft>(key: K, value: WorldCreationDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateKernelField(field: string, value: string) {
    setDraft((current) => {
      if (!current.kernel) return current
      return {
        ...current,
        kernel: updateWorldKernelField(current.kernel, field, value),
      }
    })
  }

  function toggleTheme(theme: StoryTheme) {
    setDraft((current) => {
      if (current.primary_theme === theme) {
        return { ...current, primary_theme: current.secondary_theme, secondary_theme: null }
      }
      if (current.secondary_theme === theme) {
        return { ...current, secondary_theme: null }
      }
      if (!current.primary_theme) return { ...current, primary_theme: theme }
      if (!current.secondary_theme) return { ...current, secondary_theme: theme }
      return { ...current, secondary_theme: theme }
    })
  }

  function continueToCharacter() {
    const parsed = WorldCreationDraftSchema.safeParse(draft)
    if (!parsed.success) return
    send({ type: 'select_world', draft: parsed.data })
    useGameStore.getState().setWorldBuilderConfig(null)
  }

  const resolvedKernel = previewResolved?.kernel as unknown as Record<string, string> | undefined
  const previewDetails = previewResolved && familyDefinition
    ? familyDefinition.questions.map((question) => ({ field: question.field, value: resolvedKernel?.[question.field] ?? '' }))
    : []
  const previewAnchor = previewDetails[0]?.value ? label(previewDetails[0].value) : ''
  const previewTitle = previewResolved
    ? t('worldBuilder.previewTitleV2', { family: label(previewResolved.kernel.family), anchor: previewAnchor })
    : t('worldBuilder.previewEmptyTitle')
  const previewThemes = draft.primary_theme
    ? [draft.primary_theme, draft.secondary_theme].filter(Boolean).map((theme) => label(theme!)).join(t('worldBuilder.joiner') as string)
    : t('worldBuilder.previewEmptyThemes')

  return (
    <div className="style-overlay">
      <main
        className="world-builder"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-builder-title"
        data-family={selectedFamily ?? 'UNSELECTED'}
        data-mode={mode}
      >
        <header className="world-builder-header">
          <div className="world-builder-heading">
            <div className="creation-progress" aria-label={t('creation.progressLabel')}>
              <span className="active">01 {t('creation.worldStep')}</span>
              <span>02 {t('creation.characterSetupStep')}</span>
              <span>03 {t('creation.reviewStep')}</span>
            </div>
            <h2 id="world-builder-title">{t('worldBuilder.title')}</h2>
          </div>
          <button className="world-builder-close" onClick={() => useGameStore.getState().setWorldBuilderConfig(null)} aria-label={t('worldBuilder.close')}>&#10005;</button>
        </header>

        <AutoHideScrollArea className="world-builder-scroll" viewportClassName="world-builder-scroll-viewport">
        <div className="world-builder-body">
          <section className="world-settings-panel">
            <div className="builder-mode-tabs" role="tablist" aria-label={t('worldBuilder.modeLabel')}>
              <button type="button" role="tab" aria-selected={mode === 'quick'} className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}>
                <span>{t('worldBuilder.quick')}</span>
              </button>
              <button type="button" role="tab" aria-selected={mode === 'detailed'} className={mode === 'detailed' ? 'active' : ''} onClick={() => setMode('detailed')}>
                <span>{t('worldBuilder.detailed')}</span>
              </button>
            </div>

            <div className="preset-shelf" aria-label={t('worldBuilder.presets')}>
              <div className="preset-shelf-label"><span>{t('worldBuilder.presets')}</span></div>
              <AutoHideScrollArea className="preset-scroll-area" viewportClassName="preset-scroll-viewport" orientation="horizontal">
              <div className="preset-scroll">
                {config.presets.map((preset, index) => {
                  const family = preset.draft.kernel?.family
                  return (
                    <button
                      type="button"
                      key={preset.id}
                      data-family={family}
                      className={sourcePreset?.id === preset.id ? 'selected' : ''}
                      onClick={() => choosePreset(index)}
                    >
                      <i aria-hidden="true">{family ? FAMILY_MARKS[family] : ''}</i>
                      <span>{tc(`preset.${preset.id}.label`, { defaultValue: preset.label })}</span>
                      <small>{tc(`preset.${preset.id}.description`, { defaultValue: preset.description })}</small>
                    </button>
                  )
                })}
              </div>
              </AutoHideScrollArea>
            </div>

            <AutoHideScrollArea className="world-controls-scroll" viewportClassName="world-controls-viewport">
            <section className="world-controls" key={mode}>
            <fieldset className="builder-section family-section">
              <legend><b>01</b>{t('worldBuilder.archetype')}</legend>
              <div className="family-grid">
                {config.catalogs.families.map(({ family }, index) => (
                  <button
                    type="button"
                    key={family}
                    data-family={family}
                    className={selectedFamily === family ? 'selected' : ''}
                    onClick={() => chooseFamily(family)}
                  >
                    <i aria-hidden="true">{FAMILY_MARKS[family]}</i>
                    <span><b>{label(family)}</b><small>{familyHint(family)}</small></span>
                    <em>{String(index + 1).padStart(2, '0')}</em>
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === 'detailed' && selectedFamily && draft.kernel && familyDefinition && (
              <fieldset className="builder-section detail-section">
                <legend><b>02</b>{t('worldBuilder.worldDetails')}</legend>
                <p>{t('worldBuilder.worldDetailsHintV2', { family: label(selectedFamily) })}</p>
                <div className="detail-selects">
                  {familyDefinition.questions.map((question, index) => (
                    <label key={question.field}>
                      <span><i>{String(index + 1).padStart(2, '0')}</i>{fieldLabel(question.field)}</span>
                      <select
                        value={kernelValue(draft.kernel!, question.field)}
                        onChange={(event) => updateKernelField(question.field, event.target.value)}
                      >
                        {getAvailableWorldDetailOptions(draft.kernel!, question.field).map((option) => (
                          <option key={option} value={option}>{label(option)}</option>
                        ))}
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
              <div className="mood-line">
                {config.catalogs.moods.map((mood) => (
                  <button type="button" key={mood} className={draft.mood === mood ? 'selected' : ''} onClick={() => updateField('mood', mood as StoryMood)}>
                    {label(mood)}
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === 'detailed' && (
              <fieldset className="builder-section free-text-section">
                <legend><b>05</b>{t('worldBuilder.finalTouches')}</legend>
                <label>
                  <span>{t('worldBuilder.customRequirements')}</span>
                  <TextareaAutosize maxLength={500} minRows={3} value={draft.custom_requirements} onChange={(event) => updateField('custom_requirements', event.target.value)} placeholder={t('worldBuilder.customPlaceholderV2')} />
                </label>
                <label>
                  <span>{t('worldBuilder.excludedContent')}</span>
                  <TextareaAutosize maxLength={500} minRows={2} value={draft.excluded_content} onChange={(event) => updateField('excluded_content', event.target.value)} placeholder={t('worldBuilder.excludedPlaceholder')} />
                </label>
              </fieldset>
            )}
            </section>
            </AutoHideScrollArea>
          </section>

          <aside className="world-live-page" aria-live="polite">
            <div className="world-visual" aria-hidden="true">
              <span>{selectedFamily ? FAMILY_MARKS[selectedFamily] : '界'}</span>
              <i />
              <b>{selectedFamily ? label(selectedFamily) : t('worldBuilder.awaitingWorld')}</b>
            </div>
            <AutoHideScrollArea className="world-preview-scroll" viewportClassName="world-preview-viewport">
            <div className="world-preview-copy">
              <span className="live-page-kicker">{t('worldBuilder.livePreview')}</span>
              <h3>{previewTitle}</h3>
              <p className="live-page-deck">{previewThemes}</p>
              {previewResolved && (
                <dl>
                  {previewDetails.slice(0, 6).map((detail) => (
                    <div key={detail.field}><dt>{fieldLabel(detail.field)}</dt><dd>{label(detail.value)}</dd></div>
                  ))}
                  <div><dt>{t('worldBuilder.mood')}</dt><dd>{label(previewResolved.mood)}</dd></div>
                </dl>
              )}
              {(draft.custom_requirements || draft.excluded_content) && (
                <div className="live-page-notes">
                  {draft.custom_requirements && <p><b>{t('worldBuilder.customRequirements')}</b>{draft.custom_requirements}</p>}
                  {draft.excluded_content && <p><b>{t('worldBuilder.excludedContent')}</b>{draft.excluded_content}</p>}
                </div>
              )}
              <footer>
                {sourcePreset && <span>{exactPreset ? t('worldBuilder.presetApplied', { name: tc(`preset.${sourcePreset.id}.label`, { defaultValue: sourcePreset.label }) }) : t('worldBuilder.presetModified', { name: tc(`preset.${sourcePreset.id}.label`, { defaultValue: sourcePreset.label }) })}</span>}
                {undoDraft && <button type="button" onClick={() => { setDraft(undoDraft); setUndoDraft(null) }}>{t('worldBuilder.undo')}</button>}
              </footer>
            </div>
            </AutoHideScrollArea>
          </aside>
        </div>
        </AutoHideScrollArea>
        <footer className="world-builder-footer">
          {!resolved && <span>{t('worldBuilder.requiredHintV2')}</span>}
          <button type="button" disabled={!resolved} onClick={continueToCharacter}>{t('worldBuilder.continue')}</button>
        </footer>
      </main>
    </div>
  )
}
