import type { IStateStore } from '../../infrastructure/storage/interfaces.js'
import type { ConversationHistory, ConversationTurn } from '../models/character.js'

const DEFAULT_MAX_TURNS = 20

export class ConversationManager {
  private stateStore: IStateStore

  constructor(stateStore: IStateStore) {
    this.stateStore = stateStore
  }

  async appendTurn(
    session_id: string,
    npc_id: string,
    role: 'PLAYER' | 'NPC',
    content: string,
    turn_number: number,
  ): Promise<void> {
    const key = this.historyKey(session_id, npc_id)
    let history = await this.stateStore.get<ConversationHistory>(key)

    if (!history) {
      history = {
        session_id,
        npc_id,
        turns: [],
        max_turns: DEFAULT_MAX_TURNS,
      }
    }

    const turn: ConversationTurn = { role, content, turn_number }
    history.turns.push(turn)

    await this.stateStore.set(key, history)
  }

  async getHistory(session_id: string, npc_id: string): Promise<ConversationHistory> {
    const key = this.historyKey(session_id, npc_id)
    const history = await this.stateStore.get<ConversationHistory>(key)

    if (!history) {
      return {
        session_id,
        npc_id,
        turns: [],
        max_turns: DEFAULT_MAX_TURNS,
      }
    }

    return history
  }

  async compressIfNeeded(session_id: string, npc_id: string): Promise<void> {
    const key = this.historyKey(session_id, npc_id)
    const history = await this.stateStore.get<ConversationHistory>(key)

    if (!history || history.turns.length <= history.max_turns) {
      return
    }

    const keepFirst = 2
    const keepLast = 3
    const first = history.turns.slice(0, keepFirst)
    const last = history.turns.slice(-keepLast)
    const omittedCount = history.turns.length - keepFirst - keepLast

    const summaryTurn: ConversationTurn = {
      role: 'NPC',
      content: `[...${omittedCount}轮对话省略...]`,
      turn_number: first[first.length - 1].turn_number + 1,
    }

    history.turns = [...first, summaryTurn, ...last]
    await this.stateStore.set(key, history)
  }

  private historyKey(session_id: string, npc_id: string): string {
    return `conversation:${session_id}:${npc_id}`
  }
}
