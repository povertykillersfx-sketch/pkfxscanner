import {
  Bell,
  Clock3,
  Trophy,
} from 'lucide-react'
import { STATS } from '../data/mockData'
import './StatsRow.css'

interface StatsRowProps {
  savedAlerts?: number
}

export function StatsRow({ savedAlerts }: StatsRowProps) {
  const items = [
    { label: 'Saved Alerts', value: String(savedAlerts ?? STATS.savedAlerts), icon: Bell },
    { label: 'Win Rate', value: STATS.winRate, icon: Clock3 },
    { label: 'Strategy Score', value: STATS.strategyScore, icon: Trophy },
  ]

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
