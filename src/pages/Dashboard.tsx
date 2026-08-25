import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TradeIdeasPanel } from '../components/TradeIdeaCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
import { StatsRow } from '../components/StatsRow'
import { getCommunitySettings } from '../adminStore'
import { listPublishedTradeIdeas, type TradeIdea } from '../tradeIdeas'
import './Dashboard.css'

function resolveTelegramUrl(): string | undefined {
  const channels = getCommunitySettings().channels || []
  const telegram = channels.find((c) => c.kind === 'telegram' && Boolean(c.url?.trim()))
  return telegram?.url?.trim() || undefined
}

export function Dashboard() {
  const [ideas, setIdeas] = useState<TradeIdea[]>(() => listPublishedTradeIdeas())
  const [telegramUrl, setTelegramUrl] = useState<string | undefined>(() => resolveTelegramUrl())

  useEffect(() => {
    function refreshIdeas() {
      setIdeas(listPublishedTradeIdeas())
    }
    function refreshCommunity() {
      setTelegramUrl(resolveTelegramUrl())
    }
    window.addEventListener('pkfx-trade-ideas-change', refreshIdeas)
    window.addEventListener('pkfx-community-change', refreshCommunity)
    window.addEventListener('storage', refreshIdeas)
    return () => {
      window.removeEventListener('pkfx-trade-ideas-change', refreshIdeas)
      window.removeEventListener('pkfx-community-change', refreshCommunity)
      window.removeEventListener('storage', refreshIdeas)
    }
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-top dashboard-top-ideas">
        <div className="dashboard-ideas-col">
          <TradeIdeasPanel
            ideas={ideas}
            title="Trade Ideas"
            subtitle="Latest published setups from the PKFX desk"
            telegramUrl={telegramUrl}
            compact
            limit={6}
            emptyHint="No trade ideas published yet. New ideas will appear here in real time."
          />
          {ideas.length > 6 ? (
            <Link to="/trade-ideas" className="btn btn-ghost dashboard-ideas-more">
              View all Trade Ideas
            </Link>
          ) : null}
        </div>

        <HowItWorksPanel />
      </div>

      <StatsRow savedTradeIdeas={ideas.length} />
    </div>
  )
}
