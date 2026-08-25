import { useEffect, useState } from 'react'
import { TradeIdeasPanel } from '../components/TradeIdeaCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
import { StatsRow } from '../components/StatsRow'
import { listPublishedTradeIdeas, type TradeIdea } from '../tradeIdeas'
import './Dashboard.css'

export function Dashboard() {
  const [ideas, setIdeas] = useState<TradeIdea[]>(() => listPublishedTradeIdeas())

  useEffect(() => {
    function refresh() {
      setIdeas(listPublishedTradeIdeas())
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
        <TradeIdeasPanel
          ideas={ideas}
          title="Trade Ideas"
          subtitle="Latest published setups from PKFX"
          limit={12}
          emptyHint="No trade ideas published yet. New ideas will appear here in real time."
        />

        <HowItWorksPanel />
      </div>

      <StatsRow savedTradeIdeas={ideas.length} />
    </div>
  )
}
