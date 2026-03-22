import { useState, useRef, type KeyboardEvent } from 'react'
import { useGameStore } from '../stores/useGameStore'
import './BottomBar.css'

export function BottomBar() {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const send = useGameStore((s) => s.send)
  const inputEnabled = useGameStore((s) => s.inputEnabled)
  const isProcessing = useGameStore((s) => s.isProcessing)
  const location = useGameStore((s) => s.location)
  const turn = useGameStore((s) => s.turn)

  function submit() {
    const text = input.trim()
    if (!text || !inputEnabled) return

    useGameStore.getState().appendNarrative(`> ${text}`, 'player-input')
    send({ type: 'input', text })
    useGameStore.getState().setProcessing(true)
    useGameStore.getState().setInputEnabled(false)
    setInput('')
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <footer className="bottom-bar">
      <div className="status-bar">
        {location && <span className="status-location">{location}</span>}
        {turn > 0 && <span className="status-turn">回合 {turn}</span>}
        {isProcessing && <span className="status-processing">思考中…</span>}
      </div>
      <div className="input-row">
        <input
          ref={inputRef}
          className="input-field"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={inputEnabled ? '输入你的行动…' : '等待中…'}
          disabled={!inputEnabled}
        />
        <button
          className="send-btn"
          onClick={submit}
          disabled={!inputEnabled || !input.trim()}
        >
          发送
        </button>
      </div>
    </footer>
  )
}
