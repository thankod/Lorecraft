/**
 * Theme metadata and registry.
 *
 * Swatch colors are intentionally hardcoded hex — they represent the themes
 * themselves for the settings picker preview. This is the ONLY place outside
 * variables.css where hardcoded theme colors are allowed.
 */

export type ThemeId = 'parchment' | 'moonlight' | 'hermes' | 'vellum'

export interface ThemeMeta {
  id: ThemeId
  label: string
  description: string
  swatch: {
    bg: string
    accent: string
    fg: string
  }
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'parchment',
    label: '烛光羊皮',
    description: '暖色暗调，琥珀与铜的低语',
    swatch: {
      bg: '#08080a',
      accent: '#c4956a',
      fg: '#b8b0a8',
    },
  },
  {
    id: 'moonlight',
    label: '月光长夜',
    description: '冷色暗调，月银与薄荷',
    swatch: {
      bg: '#0a0b10',
      accent: '#9ab8d8',
      fg: '#b0b4c0',
    },
  },
  {
    id: 'hermes',
    label: '深渊翠光',
    description: '深青暗调，暖橙与奶油的辉光',
    swatch: {
      bg: '#041c1c',
      accent: '#ffe6cb',
      fg: '#c8c0b4',
    },
  },
  {
    id: 'vellum',
    label: '象牙手稿',
    description: '明亮米羊皮纸，焦糖点缀',
    swatch: {
      bg: '#f2ead8',
      accent: '#8a5a2a',
      fg: '#3a2f1f',
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'parchment'

export function isThemeId(v: unknown): v is ThemeId {
  return v === 'parchment' || v === 'moonlight' || v === 'hermes' || v === 'vellum'
}

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function getNextThemeId(current: ThemeId): ThemeId {
  const idx = THEMES.findIndex((t) => t.id === current)
  return THEMES[(idx + 1) % THEMES.length].id
}
