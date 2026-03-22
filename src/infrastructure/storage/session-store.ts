import type { GenesisDocument } from '../../domain/models/genesis.js'
import type { SaveFile } from '../../domain/models/session.js'
import type { ISessionStore } from './interfaces.js'

export class InMemorySessionStore implements ISessionStore {
  private genesisDocuments = new Map<string, GenesisDocument>()
  private saveFiles = new Map<string, SaveFile>()

  async saveGenesis(doc: GenesisDocument): Promise<void> {
    this.genesisDocuments.set(doc.id, doc)
  }

  async loadGenesis(genesis_id: string): Promise<GenesisDocument | null> {
    return this.genesisDocuments.get(genesis_id) ?? null
  }

  async saveSaveFile(save: SaveFile): Promise<void> {
    this.saveFiles.set(save.save_id, save)
  }

  async loadSaveFile(save_id: string): Promise<SaveFile | null> {
    return this.saveFiles.get(save_id) ?? null
  }

  async listSaves(genesis_id: string): Promise<string[]> {
    const results: string[] = []
    for (const [id, save] of this.saveFiles) {
      if (save.genesis_document_id === genesis_id) results.push(id)
    }
    return results
  }
}
