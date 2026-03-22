import type { ILongTermMemoryStore, LongTermMemoryEntry } from './interfaces.js'

export class InMemoryLongTermMemoryStore implements ILongTermMemoryStore {
  /** npc_id -> entries */
  private entries = new Map<string, LongTermMemoryEntry[]>()
  /** `${npc_id}:${participant_id}` -> event_ids */
  private participantIndex = new Map<string, string[]>()
  /** `${npc_id}:${location_id}` -> event_ids */
  private locationIndex = new Map<string, string[]>()

  async append(entry: LongTermMemoryEntry): Promise<void> {
    const list = this.entries.get(entry.npc_id)
    if (list) {
      list.push(entry)
    } else {
      this.entries.set(entry.npc_id, [entry])
    }

    for (const pid of entry.participant_ids) {
      const key = `${entry.npc_id}:${pid}`
      const pList = this.participantIndex.get(key)
      if (pList) {
        pList.push(entry.event_id)
      } else {
        this.participantIndex.set(key, [entry.event_id])
      }
    }

    const locKey = `${entry.npc_id}:${entry.location_id}`
    const locList = this.locationIndex.get(locKey)
    if (locList) {
      locList.push(entry.event_id)
    } else {
      this.locationIndex.set(locKey, [entry.event_id])
    }
  }

  async findByParticipant(npc_id: string, participant_id: string, limit: number): Promise<LongTermMemoryEntry[]> {
    const key = `${npc_id}:${participant_id}`
    const eventIds = this.participantIndex.get(key)
    if (!eventIds) return []

    const entries = this.entries.get(npc_id) ?? []
    const idSet = new Set(eventIds)
    return entries
      .filter(e => idSet.has(e.event_id))
      .sort((a, b) => b.recorded_at_turn - a.recorded_at_turn)
      .slice(0, limit)
  }

  async findByLocation(npc_id: string, location_id: string, limit: number): Promise<LongTermMemoryEntry[]> {
    const key = `${npc_id}:${location_id}`
    const eventIds = this.locationIndex.get(key)
    if (!eventIds) return []

    const entries = this.entries.get(npc_id) ?? []
    const idSet = new Set(eventIds)
    return entries
      .filter(e => idSet.has(e.event_id))
      .sort((a, b) => b.recorded_at_turn - a.recorded_at_turn)
      .slice(0, limit)
  }

  async findRecent(npc_id: string, limit: number): Promise<LongTermMemoryEntry[]> {
    const entries = this.entries.get(npc_id)
    if (!entries) return []

    return [...entries]
      .sort((a, b) => b.recorded_at_turn - a.recorded_at_turn)
      .slice(0, limit)
  }
}
