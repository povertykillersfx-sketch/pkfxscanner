import { useEffect, useState } from 'react'
import { AlertsPanel } from '../components/AlertCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
import { StatsRow } from '../components/StatsRow'
import { WelcomePackCard } from '../components/WelcomePackCard'
import { publishedTradeIdeasAsAlerts } from '../tradeIdeas'
import type { Alert } from '../data/mockData'
import './Dashboard.css'

function usePublishedIdeaAlerts() {
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

  return alerts
}

export function Dashboard() {
  const alerts = usePublishedIdeaAlerts()

  return (
    <div className="dashboard-page">
      <WelcomePackCard />

      <div className="dashboard-top">
        <AlertsPanel
          alerts={alerts}
          title="Trade Ideas"
          subtitle="Published setups from PKFX · live levels"
          limit={12}
          emptyHint="No trade ideas published yet. New ideas will appear here when Admin publishes."
        />

        <HowItWorksPanel />
      </div>

      <StatsRow savedTradeIdeas={alerts.length} />
    </div>
  )
}
