export interface PipelineContext {
  session_id: string
  player_character_id: string
  turn_number: number
  data: Record<string, unknown>
}

export interface ContextSection {
  key: string
  content: string
  priority: number // higher = kept when truncating
  token_estimate: number
}

export interface IContextAssembler {
  assemble(context: PipelineContext): Promise<ContextSection[]>
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export class TokenBudgetManager {
  private totalBudget: number

  constructor(totalBudget: number) {
    this.totalBudget = totalBudget
  }

  fitToBudget(sections: ContextSection[]): ContextSection[] {
    // Sort by priority descending (highest priority first)
    const sorted = [...sections].sort((a, b) => b.priority - a.priority)

    let used = 0
    const kept: ContextSection[] = []

    for (const section of sorted) {
      const estimate = estimateTokens(section.content)
      if (used + estimate <= this.totalBudget) {
        kept.push({ ...section, token_estimate: estimate })
        used += estimate
      } else {
        // Try to fit a truncated version
        const remaining = this.totalBudget - used
        if (remaining > 0) {
          const truncatedLength = remaining * 4
          const truncatedContent = section.content.slice(0, truncatedLength)
          kept.push({
            ...section,
            content: truncatedContent,
            token_estimate: remaining,
          })
          used += remaining
        }
        // Skip remaining lower-priority sections once budget is exhausted
        break
      }
    }

    // Restore original priority order (lower priority first, matching prompt injection order)
    return kept.sort((a, b) => a.priority - b.priority)
  }

  get budget(): number {
    return this.totalBudget
  }
}

export { estimateTokens }
