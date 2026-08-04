import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { useT } from '../i18n'
import type { CharCreateState } from '../stores/useGameStore'
import type { PlayerProfileInput } from '../types/protocol'
import './CharCreateOverlay.css'

const ATTRIBUTE_TOTAL = 400

function getTier(value: number): number {
  if (value <= 10) return 0
  if (value <= 30) return 1
  if (value <= 60) return 2
  if (value <= 90) return 3
  return 4
}

function getTierColor(tier: number): string {
  return `tier-${Math.max(0, Math.min(4, tier))}`
}

export function CharCreateOverlay() {
  const charCreate = useGameStore((s) => s.charCreate)
  const send = useGameStore((s) => s.send)
  if (!charCreate) return null
  return <CharCreatePanel charCreate={charCreate} send={send} />
}

function CharCreatePanel({
  charCreate,
  send,
}: {
  charCreate: CharCreateState
  send: ReturnType<typeof useGameStore.getState>['send']
}) {
  const t = useT('charCreate')
  const tu = useT()
  const [step, setStep] = useState<'identity' | 'attributes' | 'review'>('identity')
  const [profile, setProfile] = useState<PlayerProfileInput>({ gender: 'MALE' })
  const [genderSelected, setGenderSelected] = useState(false)
  const [attrs, setAttrs] = useState<Record<string, number>>({ ...charCreate.attributes })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAttrs({ ...charCreate.attributes })
    setError(null)
  }, [charCreate.attributes])

  const total = Object.values(attrs).reduce((sum, value) => sum + value, 0)
  const remaining = ATTRIBUTE_TOTAL - total

  const setAttr = useCallback((id: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    setAttrs((current) => ({ ...current, [id]: clamped }))
    setError(null)
  }, [])

  function updateProfile(key: keyof PlayerProfileInput, value: string) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function selectGender(gender: 'MALE' | 'FEMALE') {
    setProfile((current) => ({ ...current, gender }))
    setGenderSelected(true)
  }

  function goToReview() {
    if (remaining !== 0) {
      setError(t('errorTotal', { sum: total, required: ATTRIBUTE_TOTAL }))
      return
    }
    for (const meta of charCreate.meta) {
      const value = attrs[meta.id]
      if (value === undefined || value < 0 || value > 100 || !Number.isInteger(value)) {
        setError(t('errorInvalid', { name: tu(`attrName.${meta.id}`, { defaultValue: meta.display_name }) }))
        return
      }
    }
    setStep('review')
  }

  function handleConfirm() {
    send({ type: 'confirm_attributes', attributes: attrs, profile })
    useGameStore.getState().setCharCreate(null)
  }

  let resolvedWorld = null
  let resolvedFamily = ''
  let worldFamily = 'UNSELECTED'
  let worldTitle: string
  let worldThemes: string
  if ('schema_version' in charCreate.worldBrief) {
    resolvedWorld = charCreate.worldBrief
    worldFamily = resolvedWorld.kernel.family
    resolvedFamily = tu(`worldBuilder.option.${resolvedWorld.kernel.family}`) as string
    const anchor = Object.entries(resolvedWorld.kernel).find(([field]) => field !== 'family')?.[1] ?? ''
    worldTitle = tu('worldBuilder.previewTitleV2', {
      family: resolvedFamily,
      anchor: tu(`worldBuilder.option.${anchor}`, { defaultValue: anchor }),
    }) as string
    worldThemes = resolvedWorld.themes
      .map((theme) => tu(`worldBuilder.option.${theme}`))
      .join(tu('worldBuilder.joiner') as string)
  } else {
    worldTitle = charCreate.worldBrief.tone
    worldThemes = charCreate.worldBrief.story_drivers
      .map((driver) => tu(`style.driver.${driver}`))
      .join(' · ')
  }

  return (
    <div className="char-create-overlay">
      <div className="character-builder" role="dialog" aria-modal="true" aria-labelledby="character-builder-title" data-family={worldFamily}>
        <header className="character-builder-header">
          <div className="creation-progress">
            <span>01 {tu('creation.worldStep')}</span>
            <span className={step === 'identity' ? 'active' : ''}>02 {tu('creation.characterStep')}</span>
            <span className={step === 'attributes' ? 'active' : ''}>03 {tu('creation.attributesStep')}</span>
            <span className={step === 'review' ? 'active' : ''}>04 {tu('creation.reviewStep')}</span>
          </div>
          <h2 id="character-builder-title">
            {step === 'identity' ? t('identityTitle') : step === 'attributes' ? t('title') : t('reviewTitle')}
          </h2>
          <p>
            {step === 'identity'
              ? t('identitySubtitle')
              : step === 'attributes'
                ? t('subtitle', { total: ATTRIBUTE_TOTAL })
                : t('reviewSubtitle')}
          </p>
        </header>

        {step === 'identity' && (
          <div className="identity-workspace step-enter">
            <aside className="selected-world-note">
              <span>{t('selectedWorld')}</span>
              <p>{worldTitle}</p>
              <dl>
                <div><dt>{t('themes')}</dt><dd>{worldThemes}</dd></div>
                {resolvedWorld && <div><dt>{t('worldType')}</dt><dd>{resolvedFamily}</dd></div>}
                {resolvedWorld && <div><dt>{t('mood')}</dt><dd>{tu(`worldBuilder.option.${resolvedWorld.mood}`)}</dd></div>}
              </dl>
              <small>{t('worldDoesNotDefineCharacter')}</small>
            </aside>

            <section className="identity-form">
              <fieldset className="gender-fieldset">
                <legend>{t('genderLabel')} <em>{t('required')}</em></legend>
                <div className="gender-options">
                  <button
                    type="button"
                    className={genderSelected && profile.gender === 'MALE' ? 'selected' : ''}
                    onClick={() => selectGender('MALE')}
                  >
                    <span>{t('genderMale')}</span>
                    <small>MALE</small>
                  </button>
                  <button
                    type="button"
                    className={genderSelected && profile.gender === 'FEMALE' ? 'selected' : ''}
                    onClick={() => selectGender('FEMALE')}
                  >
                    <span>{t('genderFemale')}</span>
                    <small>FEMALE</small>
                  </button>
                </div>
              </fieldset>

              <div className="identity-fields">
                <label>
                  <span>{t('nameLabel')} <small>{t('optional')}</small></span>
                  <input maxLength={40} value={profile.name ?? ''} onChange={(event) => updateProfile('name', event.target.value)} placeholder={t('namePlaceholder')} />
                </label>
                <label>
                  <span>{t('ageLabel')} <small>{t('optional')}</small></span>
                  <input maxLength={40} value={profile.age ?? ''} onChange={(event) => updateProfile('age', event.target.value)} placeholder={t('agePlaceholder')} />
                </label>
                <label className="wide">
                  <span>{t('roleLabel')} <small>{t('optional')}</small></span>
                  <input maxLength={120} value={profile.role ?? ''} onChange={(event) => updateProfile('role', event.target.value)} placeholder={t('rolePlaceholder')} />
                </label>
                <label className="wide">
                  <span>{t('backgroundLabel')} <small>{t('optional')}</small></span>
                  <textarea maxLength={500} rows={4} value={profile.background_seed ?? ''} onChange={(event) => updateProfile('background_seed', event.target.value)} placeholder={t('backgroundPlaceholder')} />
                </label>
              </div>
            </section>
          </div>
        )}

        {step === 'attributes' && (
          <div className="attributes-workspace step-enter">
            <div className="attr-list">
              {charCreate.meta.map((meta) => (
                <AttrRow
                  key={meta.id}
                  id={meta.id}
                  displayName={tu(`attrName.${meta.id}`, { defaultValue: meta.display_name }) as string}
                  value={attrs[meta.id] ?? 0}
                  onChange={setAttr}
                />
              ))}
            </div>
            <aside className="attribute-budget">
              <span>{t('pointBudget')}</span>
              <strong className={remaining === 0 ? 'ok' : remaining < 0 ? 'over' : ''}>{remaining}</strong>
              <p>{remaining === 0 ? t('allAllocated') : remaining > 0 ? t('remaining', { count: remaining }) : t('exceeded', { count: -remaining })}</p>
              <button type="button" onClick={() => send({ type: 'reroll_attributes' })}>{t('reroll')}</button>
            </aside>
          </div>
        )}

        {step === 'review' && (
          <div className="creation-review step-enter">
            <section>
              <span className="review-kicker">{t('reviewWorld')}</span>
              <h3>{worldTitle}</h3>
              <p>{worldThemes}{resolvedWorld ? ` · ${tu(`worldBuilder.option.${resolvedWorld.mood}`)}` : ''}</p>
            </section>
            <section>
              <span className="review-kicker">{t('reviewCharacter')}</span>
              <h3>{profile.name || t('nameGenerated')}</h3>
              <dl>
                <div><dt>{t('genderLabel')}</dt><dd>{profile.gender === 'MALE' ? t('genderMale') : t('genderFemale')}</dd></div>
                <div><dt>{t('ageLabel')}</dt><dd>{profile.age || t('generatedByWorld')}</dd></div>
                <div><dt>{t('roleLabel')}</dt><dd>{profile.role || t('generatedByWorld')}</dd></div>
              </dl>
              {profile.background_seed && <p>{profile.background_seed}</p>}
            </section>
            <section className="review-attributes">
              <span className="review-kicker">{t('reviewAttributes')}</span>
              <div>
                {charCreate.meta.map((meta) => (
                  <span key={meta.id}>
                    {tu(`attrName.${meta.id}`, { defaultValue: meta.display_name })} <strong>{attrs[meta.id]}</strong>
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {error && <div className="char-create-error">{error}</div>}

        <footer className="character-builder-footer">
          {step === 'identity' ? (
            <span>{t('identityAuthorityHint')}</span>
          ) : (
            <button type="button" className="text-action" onClick={() => setStep(step === 'review' ? 'attributes' : 'identity')}>
              {t('back')}
            </button>
          )}
          <button
            type="button"
            className="primary-action"
            disabled={step === 'identity' && !genderSelected}
            onClick={() => {
              if (step === 'identity') setStep('attributes')
              else if (step === 'attributes') goToReview()
              else handleConfirm()
            }}
          >
            {step === 'identity' ? t('continueAttributes') : step === 'attributes' ? t('continueReview') : t('confirm')}
          </button>
        </footer>
      </div>
    </div>
  )
}

function AttrRow({
  id,
  displayName,
  value,
  onChange,
}: {
  id: string
  displayName: string
  value: number
  onChange: (id: string, value: number) => void
}) {
  const t = useT('charCreate')
  const tier = getTier(value)
  const tierColor = getTierColor(tier)

  return (
    <div className="attr-row">
      <div className="attr-header">
        <span className="attr-name">{displayName}</span>
        <span className={`attr-tier-label ${tierColor}`}>{t(`${id}.${tier}.label`)}</span>
        <input
          className="attr-input"
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) => onChange(id, parseInt(event.target.value) || 0)}
        />
      </div>
      <input
        className={`attr-slider ${tierColor}`}
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={displayName}
        onChange={(event) => onChange(id, parseInt(event.target.value))}
      />
      <div className={`attr-desc ${tierColor}`}>{t(`${id}.${tier}.text`)}</div>
    </div>
  )
}
