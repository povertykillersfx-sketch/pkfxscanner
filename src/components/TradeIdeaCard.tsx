import { useState } from 'react'
import {
  TrendingDown,
  TrendingUp,
  Lightbulb,
  LineChart,
  Megaphone,
  Send,
  Shield,
  CheckCircle2,
  Bell,
  HelpCircle,
} from 'lucide-react'
import type { TradeIdea } from '../tradeIdeas'
import {
  formatTradeIdeaTime,
  pairDisplayName,
  tradeIdeaRiskReward,
} from '../tradeIdeas'
import { PairChartModal } from './PairChartModal'
import './TradeIdeaCard.css'

interface TradeIdeaCardProps {
  idea: TradeIdea
}

export function TradeIdeaCard({ idea }: TradeIdeaCardProps) {
  const [chartOpen, setChartOpen] = useState(false)
  const isSell = idea.direction === 'Sell'
  const rr = tradeIdeaRiskReward(idea)

  return (
    <>
      <article className={`ti-card ${isSell ? 'is-sell' : 'is-buy'}`}>
        <div className="ti-card-accent" aria-hidden />

        <div className="ti-card-body">
          <header className="ti-card-head">
            <div className="ti-pair-block">
              <span className="ti-pair-mark" aria-hidden>
                {idea.pair.slice(0, 2)}
              </span>
              <div>
                <strong className="ti-pair font-display">{idea.pair}</strong>
                <p className="ti-pair-name">{pairDisplayName(idea.pair)}</p>
              </div>
            </div>

            <span className={`ti-dir dir-${idea.direction.toLowerCase()}`}>
              {isSell ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {idea.direction}
            </span>

            <div className="ti-meta-block">
              <span className="ti-meta-label">Entry Zone</span>
              <strong>{idea.entryZone || '—'}</strong>
            </div>

            <div className="ti-meta-block ti-published">
              <span className="ti-meta-label">Published</span>
              <strong>{formatTradeIdeaTime(idea.publishedAt || idea.createdAt)}</strong>
            </div>
          </header>

          <div className="ti-levels">
            <div className="ti-level is-sl">
              <span>Stop Loss</span>
              <strong>{idea.stopLoss || '—'}</strong>
            </div>
            <div className="ti-level is-tp">
              <span>Take Profit 1</span>
              <strong>{idea.tp1 || '—'}</strong>
            </div>
            <div className="ti-level is-tp">
              <span>Take Profit 2</span>
              <strong>{idea.tp2 || '—'}</strong>
            </div>
            <div className="ti-level is-rr">
              <span>Risk Reward</span>
              <strong>{rr}</strong>
            </div>
          </div>

          {idea.notes ? (
            <div className="ti-notes">
              <span className="ti-notes-label">Notes</span>
              <p>{idea.notes}</p>
            </div>
          ) : null}

          <footer className="ti-card-foot">
            <button type="button" className="btn ti-chart-btn" onClick={() => setChartOpen(true)}>
              <LineChart size={16} />
              View Chart
            </button>
          </footer>
        </div>
      </article>

      {chartOpen ? (
        <PairChartModal
          pair={idea.pair}
          title={`${idea.pair} · ${idea.direction}`}
          onClose={() => setChartOpen(false)}
        />
      ) : null}
    </>
  )
}

interface TradeIdeasPanelProps {
  ideas: TradeIdea[]
  title?: string
  subtitle?: string
  loading?: boolean
  emptyHint?: string
  limit?: number
  telegramUrl?: string
  compact?: boolean
  onHowItWorks?: () => void
}

export function TradeIdeasPanel({
  ideas,
  title = 'Trade Ideas',
  subtitle = 'Curated market analysis from the PKFX desk — not automated noise.',
  loading = false,
  emptyHint = 'No trade ideas published yet. Check back soon.',
  limit,
  telegramUrl,
  compact = false,
  onHowItWorks,
}: TradeIdeasPanelProps) {
  const shown = typeof limit === 'number' ? ideas.slice(0, limit) : ideas

  return (
    <div className={`ti-layout ${compact ? 'is-compact' : ''}`}>
      <div className="ti-main">
        <header className="ti-page-head animate-fade-up">
          <div className="ti-page-title">
            <span className="ti-title-icon" aria-hidden>
              <Lightbulb size={22} />
            </span>
            <div>
              <h1 className="font-display">{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          {onHowItWorks ? (
            <button type="button" className="btn btn-ghost ti-how-btn" onClick={onHowItWorks}>
              <HelpCircle size={16} />
              How It Works
            </button>
          ) : null}
        </header>

        {telegramUrl ? (
          <aside className="ti-telegram-banner panel animate-fade-up stagger-1">
            <div className="ti-telegram-copy">
              <span className="ti-telegram-icon" aria-hidden>
                <Megaphone size={18} />
              </span>
              <div>
                <strong>Stay updated in real time</strong>
                <p>Get notified the moment a new Trade Idea is published.</p>
              </div>
            </div>
            <a
              className="btn btn-primary ti-telegram-cta"
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Send size={15} />
              Join Our Telegram
            </a>
          </aside>
        ) : null}

        <section className="ti-list-section animate-fade-up stagger-2">
          <div className="ti-list-head">
            <h2 className="font-display">Latest Trade Ideas</h2>
            <span className="text-muted">
              {shown.length} live {shown.length === 1 ? 'idea' : 'ideas'}
            </span>
          </div>

          {loading ? (
            <div className="ti-empty panel">
              <Lightbulb size={28} />
              <p>Loading trade ideas…</p>
            </div>
          ) : shown.length === 0 ? (
            <div className="ti-empty panel">
              <Lightbulb size={28} />
              <p>{emptyHint}</p>
            </div>
          ) : (
            <div className="ti-card-stack">
              {shown.map((idea) => (
                <TradeIdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </section>
      </div>

      {!compact ? (
        <aside className="ti-side animate-fade-up stagger-2">
          <section className="ti-side-card panel">
            <div className="ti-side-icon" aria-hidden>
              <Lightbulb size={18} />
            </div>
            <h3 className="font-display">About Trade Ideas</h3>
            <p>
              These are analysis-based trade ideas from the PKFX desk. They are for education and
              discussion — always do your own analysis before trading.
            </p>
            <ul className="ti-checklist">
              <li>
                <CheckCircle2 size={14} /> Not financial advice
              </li>
              <li>
                <CheckCircle2 size={14} /> Do your own analysis
              </li>
              <li>
                <CheckCircle2 size={14} /> Manage your risk
              </li>
              <li>
                <CheckCircle2 size={14} /> Trade responsibly
              </li>
            </ul>
          </section>

          {telegramUrl ? (
            <section className="ti-side-card panel">
              <div className="ti-side-icon" aria-hidden>
                <Bell size={18} />
              </div>
              <h3 className="font-display">Telegram</h3>
              <p>Join the channel for instant Trade Idea notifications on your phone.</p>
              <a
                className="btn btn-primary ti-side-cta"
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Send size={15} />
                Join Telegram
              </a>
            </section>
          ) : null}

          <section className="ti-side-card panel ti-disclaimer">
            <div className="ti-side-icon" aria-hidden>
              <Shield size={18} />
            </div>
            <h3 className="font-display">Disclaimer</h3>
            <p>
              Trading forex and CFDs involves substantial risk of loss. Content on PKFX is
              educational only and does not constitute investment advice. Past performance is not
              indicative of future results.
            </p>
          </section>
        </aside>
      ) : null}
    </div>
  )
}
