import { useEffect, useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
import { StatsRow } from '../components/StatsRow'
import { publishedTradeIdeasAsAlerts } from '../tradeIdeas'
import type { Alert } from '../data/mockData'
import './Dashboard.css'

export function TradeIdeasPage() {
  const [alerts, setAlerts] = useState<Alert[]>(() => publishedTradeIdeasAsAlerts())

  useEffect(() => {
    function refresh() {
      setAlerts(publishedTradeIdeasAsAlerts())
    }
    window.addEventListener('pkfx-trade-ideas-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-trade-ideas-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">
        <AlertsPanel
          alerts={alerts}
          title="Trade Ideas"
          subtitle="All published Trade Ideas from PKFX"
          limit={40}
          emptyHint="No trade ideas published yet. Check back after Admin publishes a setup."
        />
        <HowItWorksPanel />
      </div>
      <StatsRow savedTradeIdeas={alerts.length} />
    </div>
  )
}
