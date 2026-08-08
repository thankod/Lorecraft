function isValidJson(value: string): boolean {
  if (!value) return false
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function codeBlockCandidates(raw: string): string[] {
  const candidates: string[] = []
  const pattern = /```(?:json)?[^\S\r\n]*(?:\r?\n)?([\s\S]*?)```/gi
  for (const match of raw.matchAll(pattern)) {
    const candidate = match[1]?.trim()
    if (candidate) candidates.push(candidate)
  }
  return candidates
}

function balancedCandidateAt(raw: string, start: number): string | null {
  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let index = start; index < raw.length; index++) {
    const character = raw[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      continue
    }

    if (character === '{' || character === '[') {
      stack.push(character)
      continue
    }

    if (character !== '}' && character !== ']') continue
    const expected = character === '}' ? '{' : '['
    if (stack.pop() !== expected) return null
    if (stack.length === 0) return raw.slice(start, index + 1).trim()
  }

  return null
}

function balancedCandidates(raw: string): string[] {
  const candidates: string[] = []
  for (let index = 0; index < raw.length; index++) {
    if (raw[index] !== '{' && raw[index] !== '[') continue
    const candidate = balancedCandidateAt(raw, index)
    if (candidate) candidates.push(candidate)
  }
  return candidates
}

/** Returns a complete, parseable JSON value found in a model response. */
export function extractValidJson(raw: string): string | null {
  const trimmed = raw.trim()
  if (isValidJson(trimmed)) return trimmed

  const candidates = [
    ...codeBlockCandidates(trimmed),
    ...balancedCandidates(trimmed),
  ]
  return candidates.find(isValidJson) ?? null
}

/**
 * Returns the most useful JSON candidate for parsing and diagnostics.
 * Valid candidates win; otherwise preserve a non-empty malformed candidate
 * so error messages and repair prompts do not collapse to a blank string.
 */
export function extractJson(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const valid = extractValidJson(trimmed)
  if (valid) return valid

  const fenced = codeBlockCandidates(trimmed)
  if (fenced.length > 0) return fenced[0]

  const balanced = balancedCandidates(trimmed)
  return balanced[0] ?? trimmed
}
