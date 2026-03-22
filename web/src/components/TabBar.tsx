import { tabs } from '../tabs/registry'
import './TabBar.css'

interface Props {
  activeTab: string
  onSelect: (id: string) => void
}

export function TabBar({ activeTab, onSelect }: Props) {
  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab-btn ${t.id === activeTab ? 'active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.icon && <span className="tab-icon">{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </nav>
  )
}
