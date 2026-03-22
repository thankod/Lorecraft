import type { Event, EventTier1, EventTier2, EventTier3, EventTier4 } from '../../domain/models/event.js'
import type { GameTimestamp } from '../../domain/models/common.js'
import type { IEventStore } from './interfaces.js'

function compareTimestamps(a: GameTimestamp, b: GameTimestamp): number {
  if (a.day !== b.day) return a.day - b.day
  if (a.hour !== b.hour) return a.hour - b.hour
  return a.turn - b.turn
}

export class InMemoryEventStore implements IEventStore {
  private tier1 = new Map<string, EventTier1>()
  private tier2 = new Map<string, EventTier2>()
  private tier3 = new Map<string, EventTier3>()
  private tier4 = new Map<string, EventTier4>()

  /** participant_id -> event_ids */
  private participantIndex = new Map<string, string[]>()
  /** Insertion-ordered tier1 ids for time scanning */
  private timeOrderedIds: string[] = []

  async append(event: Event): Promise<void> {
    if (this.tier1.has(event.id)) return

    const { summary, choice_signals, context, related_event_ids, state_snapshot, narrative_text, ...t1 } = event

    this.tier1.set(event.id, t1)
    this.tier2.set(event.id, { summary, choice_signals })
    this.tier3.set(event.id, { context, related_event_ids, state_snapshot })
    this.tier4.set(event.id, { narrative_text })

    this.timeOrderedIds.push(event.id)

    for (const pid of event.participant_ids) {
      const list = this.participantIndex.get(pid)
      if (list) {
        list.push(event.id)
      } else {
        this.participantIndex.set(pid, [event.id])
      }
    }
  }

  async getTier1(event_id: string): Promise<EventTier1 | null> {
    return this.tier1.get(event_id) ?? null
  }

  async getTier2(event_id: string): Promise<EventTier2 | null> {
    return this.tier2.get(event_id) ?? null
  }

  async getTier3(event_id: string): Promise<EventTier3 | null> {
    return this.tier3.get(event_id) ?? null
  }

  async getTier4(event_id: string): Promise<EventTier4 | null> {
    return this.tier4.get(event_id) ?? null
  }

  async getTiers(event_id: string, tiers: number[]): Promise<Partial<Event> | null> {
    const t1 = this.tier1.get(event_id)
    if (!t1) return null

    let result: Partial<Event> = {}

    for (const tier of tiers) {
      switch (tier) {
        case 1:
          result = { ...result, ...t1 }
          break
        case 2: {
          const t2 = this.tier2.get(event_id)
          if (t2) result = { ...result, ...t2 }
          break
        }
        case 3: {
          const t3 = this.tier3.get(event_id)
          if (t3) result = { ...result, ...t3 }
          break
        }
        case 4: {
          const t4 = this.tier4.get(event_id)
          if (t4) result = { ...result, ...t4 }
          break
        }
      }
    }

    return result
  }

  async scanByTimeRange(from: GameTimestamp, to: GameTimestamp): Promise<EventTier1[]> {
    const results: EventTier1[] = []

    for (const id of this.timeOrderedIds) {
      const t1 = this.tier1.get(id)!
      if (compareTimestamps(t1.timestamp, from) >= 0 && compareTimestamps(t1.timestamp, to) <= 0) {
        results.push(t1)
      }
    }

    return results
  }

  async scanByParticipant(npc_id: string, limit: number): Promise<EventTier1[]> {
    const ids = this.participantIndex.get(npc_id)
    if (!ids) return []

    const results: EventTier1[] = []
    for (let i = ids.length - 1; i >= 0 && results.length < limit; i--) {
      const t1 = this.tier1.get(ids[i])
      if (t1) results.push(t1)
    }

    return results
  }

  async getAllTier1(): Promise<EventTier1[]> {
    return Array.from(this.tier1.values())
  }
}
