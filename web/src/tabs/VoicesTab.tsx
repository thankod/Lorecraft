import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { registerTab } from './registry'
import './VoicesTab.css'

function VoicesTab() {
  const voices = useGameStore((s) => s.voices)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [voices])

  return (
    <div className="voices-tab" ref={containerRef}>
      {voices.length === 0 ? (
        <div className="voices-empty">尚无内心声音</div>
      ) : (
        voices.map((v, i) => (
          <div key={i} className="voice-entry">
            <div className="voice-trait">[{v.trait_id}]</div>
            <div className="voice-line">{v.line}</div>
          </div>
        ))
      )}
    </div>
  )
}

registerTab({ id: 'voices', label: '内心声音', icon: '💭', component: VoicesTab })
