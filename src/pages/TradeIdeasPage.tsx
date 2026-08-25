import { useEffect, useState } from 'react'
import { TradeIdeasPanel } from '../components/TradeIdeaCard'
import { StatsRow } from '../components/StatsRow'
import {
  listPublishedTradeIdeas,
  type TradeIdea,
} from '../tradeIdeas'
import './TradeIdeasPage.css'

export function TradeIdeasPage() {
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
    <div className="trade-ideas-page">
      <TradeIdeasPanel
        ideas={ideas}
        title="Trade Ideas"
        subtitle="Live setups published by PKFX"
        emptyHint="No trade ideas have been published yet. New ideas will appear here as soon as they go live."
      />
      <StatsRow savedTradeIdeas={ideas.length} />
    </div>
  )
}
