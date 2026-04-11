// web/src/tabs/quest-colors.ts

const PALETTE_SIZE = 8

let paletteCache: string[] | null = null

function readPalette(): string[] {
  if (paletteCache) return paletteCache
  const style = getComputedStyle(document.documentElement)
  const colors: string[] = []
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const v = style.getPropertyValue(`--quest-palette-${i}`).trim()
    colors.push(v || '#c4956a')
  }
  paletteCache = colors
  return colors
}

/** Clear palette cache — call after theme change */
export function clearPaletteCache(): void {
  paletteCache = null
  // Re-resolve assigned quest colors to new palette values
  for (const [questId, idx] of questIdxCache.entries()) {
    questCache.set(questId, readPalette()[idx % PALETTE_SIZE])
    void questId
  }
}

const questCache = new Map<string, string>()
const questIdxCache = new Map<string, number>()
let nextIdx = 0

export function questColor(questId: string): string {
  let c = questCache.get(questId)
  if (!c) {
    const idx = nextIdx++
    questIdxCache.set(questId, idx)
    c = readPalette()[idx % PALETTE_SIZE]
    questCache.set(questId, c)
  }
  return c
}

/** Reset cache — call when game resets */
export function resetQuestColors(): void {
  questCache.clear()
  questIdxCache.clear()
  nextIdx = 0
}
