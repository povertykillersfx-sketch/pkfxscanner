import { useEffect, useMemo, useState } from 'react'
import { TradeIdeasPanel } from '../components/TradeIdeaCard'
import { HowItWorksPanel } from '../components/HowItWorksPanel'
import { getCommunitySettings } from '../adminStore'
import { listPublishedTradeIdeas, type TradeIdea } from '../tradeIdeas'
import './TradeIdeasPage.css'

function resolveTelegramUrl(): string | undefined {
  const channels = getCommunitySettings().channels || []
  const telegram = channels.find(
    (c) => c.kind === 'telegram' && Boolean(c.url?.trim()),
  )
  return telegram?.url?.trim() || undefined
}

export function TradeIdeasPage() {
  const [ideas, setIdeas] = useState<TradeIdea[]>(() => listPublishedTradeIdeas())
  const [telegramUrl, setTelegramUrl] = useState<string | undefined>(() => resolveTelegramUrl())
  const [showHow, setShowHow] = useState(false)

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

  const subtitle = useMemo(
    () => 'Curated market analysis from the PKFX desk — educational setups you can review live.',
    [],
  )

  return (
    <div className="trade-ideas-page">
      <TradeIdeasPanel
        ideas={ideas}
        title="Trade Ideas"
        subtitle={subtitle}
        telegramUrl={telegramUrl}
        onHowItWorks={() => setShowHow((v) => !v)}
        emptyHint="No trade ideas have been published yet. New ideas will appear here as soon as they go live."
      />

      {showHow ? (
        <div className="trade-ideas-how animate-fade-up">
          <HowItWorksPanel />
        </div>
      ) : null}
    </div>
  )
}
