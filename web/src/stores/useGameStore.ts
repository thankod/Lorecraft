import { create } from 'zustand'
import type { ClientMessage } from '../types/protocol'

export interface NarrativeLine {
  text: string
  cls: string
}

export interface VoiceEntry {
  trait_id: string
  line: string
}

interface GameState {
  // Connection
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  send: (msg: ClientMessage) => void

  // Game
  narrativeLines: NarrativeLine[]
  voices: VoiceEntry[]
  location: string
  turn: number
  isProcessing: boolean
  inputEnabled: boolean
  initDoc: any | null

  // Actions
  setConnectionStatus: (s: GameState['connectionStatus']) => void
  setSend: (fn: (msg: ClientMessage) => void) => void
  appendNarrative: (text: string, cls: string) => void
  appendVoices: (entries: VoiceEntry[]) => void
  setStatus: (location: string, turn: number) => void
  setProcessing: (v: boolean) => void
  setInputEnabled: (v: boolean) => void
  setInitDoc: (doc: any) => void
}

const noop = () => {}

export const useGameStore = create<GameState>((set) => ({
  connectionStatus: 'disconnected',
  send: noop,

  narrativeLines: [],
  voices: [],
  location: '',
  turn: 0,
  isProcessing: false,
  inputEnabled: false,
  initDoc: null,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setSend: (send) => set({ send }),

  appendNarrative: (text, cls) =>
    set((s) => ({ narrativeLines: [...s.narrativeLines, { text, cls }] })),

  appendVoices: (entries) =>
    set((s) => ({ voices: [...s.voices, ...entries] })),

  setStatus: (location, turn) => set({ location, turn }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setInputEnabled: (inputEnabled) => set({ inputEnabled }),
  setInitDoc: (initDoc) => set({ initDoc }),
}))
