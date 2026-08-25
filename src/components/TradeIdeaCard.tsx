import { TrendingDown, TrendingUp, Lightbulb } from 'lucide-react'
import type { TradeIdea } from '../tradeIdeas'
import { formatTradeIdeaTime } from '../tradeIdeas'
import './TradeIdeaCard.css'

interface TradeIdeaCardProps {
  idea: TradeIdea
}

export function TradeIdeaCard({ idea }: TradeIdeaCardProps) {
  const isSell = idea.direction === 'Sell'

  return (
    <article className={`trade-idea-card ${isSell ? 'is-sell' : 'is-buy'}`}>
      <header className="trade-idea-top">
        <div className="trade-idea-title">
          <strong className="font-display">{idea.pair}</strong>
          <span className={`trade-idea-dir dir-${idea.direction.toLowerCase()}`}>
            {isSell ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {idea.direction}
          </span>
        </div>
        <time className="trade-idea-time" dateTime={idea.publishedAt || idea.createdAt}>
          {formatTradeIdeaTime(idea.publishedAt || idea.createdAt)}
        </time>
      </header>

      <div className="trade-idea-levels">
        <div className="trade-idea-level is-sl">
          <span>Stop Loss</span>
          <strong>{idea.stopLoss || '—'}</strong>
        </div>
        <div className="trade-idea-level is-tp">
          <span>TP1</span>
          <strong>{idea.tp1 || '—'}</strong>
        </div>
        <div className="trade-idea-level is-tp">
          <span>TP2</span>
          <strong>{idea.tp2 || '—'}</strong>
        </div>
      </div>

      {idea.notes ? <p className="trade-idea-notes">{idea.notes}</p> : null}
    </article>
  )
}

interface TradeIdeasPanelProps {
  ideas: TradeIdea[]
  title?: string
  subtitle?: string
  loading?: boolean
  emptyHint?: string
  limit?: number
}

export function TradeIdeasPanel({
  ideas,
  title = 'Trade Ideas',
  subtitle = 'Published setups from PKFX',
  loading = false,
  emptyHint = 'No trade ideas published yet. Check back soon.',
  limit,
}: TradeIdeasPanelProps) {
  const shown = typeof limit === 'number' ? ideas.slice(0, limit) : ideas

  return (
    <section className="trade-ideas-panel panel panel-glow animate-fade-up">
      <div className="trade-ideas-panel-header">
        <div>
          <h2 className="font-display">{title}</h2>
          <p className="trade-ideas-sub">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="trade-ideas-empty">
          <Lightbulb size={28} />
          <p>Loading trade ideas…</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="trade-ideas-empty">
          <Lightbulb size={28} />
          <p>{emptyHint}</p>
        </div>
      ) : (
        <div className="trade-ideas-grid">
          {shown.map((idea) => (
            <TradeIdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </section>
  )
}
