import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Rocket,
  Heart,
  X,
} from 'lucide-react'
import type { Alert } from '../data/mockData'
import { formatSessionTime } from '../alerts'
import { ChartModal } from './ChartModal'
import './AlertCard.css'

interface AlertCardProps {
  alert: Alert
}

export function AlertCard({ alert }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const isBearish = alert.sentiment === 'Bearish'
  const isCurrent = Boolean(alert.trending)

  return (
    <>
      <article className={`alert-card ${expanded ? 'expanded' : ''} ${isCurrent ? 'is-current' : ''}`}>
        <header className="alert-row">
          <button
            type="button"
            className="alert-asset-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {isCurrent && (
              <span className="current-dot" title="Current running trade" aria-label="Current running trade" />
            )}
            {alert.asset}
          </button>
          <span className={`badge ${isBearish ? 'badge-bearish' : 'badge-bullish'}`}>
            {alert.sentiment}
          </span>
          <span className="alert-session">{alert.session}</span>
          {alert.live && <span className="live-pill" title="Built from live market OHLC">LIVE</span>}
          {!alert.live && (
            <span className="demo-pill" title="Not live market OHLC — demo/fallback feed">
              DEMO
            </span>
          )}
          <span className={`trend-orb ${isBearish ? 'down' : 'up'}`}>
            {isBearish ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          </span>
          <span className="alert-date">
            <span className="date-dot" aria-hidden />
            {formatSessionTime(alert.noticedAt)}
          </span>
          <button
            type="button"
            className="expand-btn"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse alert' : 'Expand alert'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <X size={16} /> : <ChevronDown size={16} />}
          </button>
        </header>

        {expanded && (
          <div className="alert-body animate-fade-up">
            {alert.aiNote ? <p className="alert-ai-note">{alert.aiNote}</p> : null}

            {isCurrent && (
              <div className="trending-label">
                <span className="current-dot" aria-hidden />
                <Rocket size={14} />
                <span>CURRENT TRADE · {alert.session}</span>
              </div>
            )}

            {alert.entry && (
              <p className="alert-entry">
                Entry: <strong>{alert.entry}</strong>
                {alert.spot && alert.spot !== alert.entry && (
                  <>
                    {' '}
                    · market <strong>{alert.spot}</strong>
                  </>
                )}
              </p>
            )}

            <div className="levels-grid">
              <div className="levels-col">
                <h4>Possible Targets</h4>
                {alert.targets.map((t, i) => (
                  <div key={`t-${t}-${i}`} className="level-bar target">
                    TP{i + 1} · {t}
                  </div>
                ))}
              </div>
              <div className="levels-col">
                <h4>Invalidation</h4>
                {alert.reversals.map((r, i) => (
                  <div key={`r-${r}-${i}`} className="level-bar reversal">
                    {i === 0 ? 'SL' : 'Ext'} · {r}
                  </div>
                ))}
              </div>
            </div>

            <div className="alert-actions">
              <button type="button" className="btn-dark" onClick={() => setChartOpen(true)}>
                VIEW CHART
              </button>
              <button
                type="button"
                className={`fav-btn ${favorited ? 'on' : ''}`}
                aria-label="Favorite"
                onClick={() => setFavorited((v) => !v)}
              >
                <Heart size={18} fill={favorited ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        )}
      </article>

      {chartOpen && <ChartModal alert={alert} onClose={() => setChartOpen(false)} />}
    </>
  )
}

interface AlertsPanelProps {
  alerts: Alert[]
  title?: string
  subtitle?: string
  onEditScanner?: () => void
  limit?: number
  emptyHint?: string
  loading?: boolean
  liveFeed?: boolean
  /** When true, only the current running trade per selected symbol is shown */
  currentOnly?: boolean
  /** When true, copy reflects current trading day (Dashboard) */
  todayOnly?: boolean
  symbols?: string[]
}

export function AlertsPanel({
  alerts,
  title = 'Trade Ideas',
  subtitle,
  onEditScanner,
  limit,
  emptyHint = 'No trade ideas published yet.',
  loading = false,
  liveFeed = false,
  currentOnly = false,
  todayOnly = false,
  symbols = [],
}: AlertsPanelProps) {
  const [showAll, setShowAll] = useState(false)

  const scoped = currentOnly
    ? alerts.filter((a) => a.trending && (symbols.length === 0 || symbols.includes(a.asset)))
    : alerts.filter((a) => symbols.length === 0 || symbols.includes(a.asset))

  const visible = showAll || !limit ? scoped : scoped.slice(0, limit)

  const defaultSub =
    todayOnly || currentOnly
      ? 'Published Trade Ideas · current setups'
      : liveFeed
        ? 'Published Trade Ideas · synced live'
        : loading
          ? 'Loading Trade Ideas…'
          : 'Published Trade Ideas from PKFX'

  return (
    <section className="alerts-panel panel panel-glow animate-fade-up">
      <div className="alerts-panel-header">
        <div>
          <h2 className="font-display">{title}</h2>
          <p className="alerts-sub">{subtitle || defaultSub}</p>
        </div>
        {onEditScanner && (
          <button type="button" className="btn btn-outline edit-scanner" onClick={onEditScanner}>
            <span className="gear">⚙</span> Add Symbols
          </button>
        )}
      </div>

      {loading && scoped.length === 0 ? (
        <div className="alerts-empty">
          <p>Reading live market data…</p>
        </div>
      ) : scoped.length === 0 ? (
        <div className="alerts-empty">
          <p>{emptyHint}</p>
          {onEditScanner && (
            <button type="button" className="btn btn-primary" onClick={onEditScanner}>
              Add Symbols
            </button>
          )}
        </div>
      ) : (
        <div className="alerts-grid">
          {visible.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {limit && scoped.length > limit && (
        <div className="alerts-footer">
          <button type="button" className="btn btn-ghost view-more" onClick={() => setShowAll((v) => !v)}>
            {showAll ? (
              <>
                View Less <ChevronUp size={14} />
              </>
            ) : (
              <>
                View More <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
