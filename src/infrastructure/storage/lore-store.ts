import type { LoreEntry } from '../../domain/models/lore.js'
import type { ILoreStore } from './interfaces.js'

export class InMemoryLoreStore implements ILoreStore {
  private entries = new Map<string, LoreEntry>()
  /** subject_id -> lore_ids */
  private subjectIndex = new Map<string, string[]>()
  /** content_hash -> lore_id */
  private contentHashIndex = new Map<string, string>()

  async append(entry: LoreEntry): Promise<void> {
    this.entries.set(entry.id, entry)

    for (const sid of entry.subject_ids) {
      const list = this.subjectIndex.get(sid)
      if (list) {
        list.push(entry.id)
      } else {
        this.subjectIndex.set(sid, [entry.id])
      }
    }

    this.contentHashIndex.set(entry.content_hash, entry.id)
  }

  async findBySubject(subject_id: string): Promise<LoreEntry[]> {
    const ids = this.subjectIndex.get(subject_id)
    if (!ids) return []
    return ids.map(id => this.entries.get(id)).filter((e): e is LoreEntry => e !== undefined)
  }

  async findByContentHash(hash: string): Promise<LoreEntry | null> {
    const id = this.contentHashIndex.get(hash)
    if (!id) return null
    return this.entries.get(id) ?? null
  }

  async findByFactType(fact_type: string): Promise<LoreEntry[]> {
    const results: LoreEntry[] = []
    for (const entry of this.entries.values()) {
      if (entry.fact_type === fact_type) results.push(entry)
    }
    return results
  }

  async getById(id: string): Promise<LoreEntry | null> {
    return this.entries.get(id) ?? null
  }

  async update(id: string, updates: Partial<LoreEntry>): Promise<void> {
    const existing = this.entries.get(id)
    if (!existing) return

    const updated = { ...existing, ...updates }
    this.entries.set(id, updated)

    // Rebuild content hash index if hash changed
    if (updates.content_hash && updates.content_hash !== existing.content_hash) {
      this.contentHashIndex.delete(existing.content_hash)
      this.contentHashIndex.set(updated.content_hash, id)
    }

    // Rebuild subject index if subjects changed
    if (updates.subject_ids) {
      for (const sid of existing.subject_ids) {
        const list = this.subjectIndex.get(sid)
        if (list) {
          const idx = list.indexOf(id)
          if (idx !== -1) list.splice(idx, 1)
        }
      }
      for (const sid of updated.subject_ids) {
        const list = this.subjectIndex.get(sid)
        if (list) {
          list.push(id)
        } else {
          this.subjectIndex.set(sid, [id])
        }
      }
    }
  }
}
