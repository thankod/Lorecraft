import type { IStateStore } from './interfaces.js'

export class InMemoryStateStore implements IStateStore {
  private store = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key)
    return value === undefined ? null : (value as T)
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async listByPrefix(prefix: string): Promise<string[]> {
    const results: string[] = []
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) results.push(key)
    }
    return results
  }
}
