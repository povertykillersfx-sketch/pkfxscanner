import { Bell, Clock3 } from 'lucide-react'
import { STATS } from '../data/mockData'
import './StatsRow.css'

interface StatsRowProps {
  savedAlerts?: number
  savedTradeIdeas?: number
}

export function StatsRow({ savedAlerts, savedTradeIdeas }: StatsRowProps) {
  const count = savedTradeIdeas ?? savedAlerts ?? STATS.savedAlerts
  const items = [
    { label: 'Trade Ideas', value: String(count), icon: Bell },
    { label: 'Win Rate', value: STATS.winRate, icon: Clock3 },
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
