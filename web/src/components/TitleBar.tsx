import { useGameStore } from '../stores/useGameStore'
import './TitleBar.css'

export function TitleBar() {
  const status = useGameStore((s) => s.connectionStatus)

  return (
    <header className="title-bar">
      <span className="title-logo">&#9876; LORECRAFT</span>
      <span className={`conn-dot ${status}`} title={status} />
    </header>
  )
}
