import {
  Bell,
  Clock3,
  Trophy,
} from 'lucide-react'
import { STATS } from '../data/mockData'
import './StatsRow.css'

const items = [
  { label: 'Saved Alerts', value: String(STATS.savedAlerts), icon: Bell },
  { label: 'Win Rate', value: STATS.winRate, icon: Clock3 },
  { label: 'Strategy Score', value: STATS.strategyScore, icon: Trophy },
]

export function StatsRow() {
  return (
    <div className="stats-row animate-fade-up stagger-3">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="stat-card panel">
          <div className="stat-icon">
            <Icon size={22} strokeWidth={1.75} />
          </div>
          <div className="stat-meta">
            <span className="stat-label">{label}</span>
            <span className="stat-value font-display">{value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
