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

  return (
    <>
      <article className={`alert-card ${expanded ? 'expanded' : ''}`}>
        <header className="alert-row">
          <span className="alert-asset">{alert.asset}</span>
          <span className={`badge ${isBearish ? 'badge-bearish' : 'badge-bullish'}`}>
            {alert.sentiment}
          </span>
          <span className="alert-strategy">{alert.strategy}</span>
          <span className={`trend-orb ${isBearish ? 'down' : 'up'}`}>
            {isBearish ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          </span>
          <span className="alert-date">
            <span className="date-dot" aria-hidden />
            {alert.date}
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
            {alert.trending && (
              <div className="trending-label">
                <Rocket size={14} />
                <span>TRENDING</span>
              </div>
            )}

            <div className="levels-grid">
              <div className="levels-col">
                <h4>Possible Targets</h4>
                {(alert.targets ?? ['—', '—']).map((t) => (
                  <div key={`t-${t}`} className="level-bar target">
                    {t}
                  </div>
                ))}
              </div>
              <div className="levels-col">
                <h4>Possible Reversals</h4>
                {(alert.reversals ?? ['—', '—']).map((r) => (
                  <div key={`r-${r}`} className="level-bar reversal">
                    {r}
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

      {chartOpen && (
        <ChartModal
          alert={alert}
          onClose={() => setChartOpen(false)}
        />
      )}
    </>
  )
}

interface AlertsPanelProps {
  alerts: Alert[]
  title?: string
  onEditScanner?: () => void
  limit?: number
  emptyHint?: string
}

export function AlertsPanel({
  alerts,
  title = 'My Alerts',
  onEditScanner,
  limit,
  emptyHint = 'No symbols in your scanner yet. Click Edit Scanner to add instruments.',
}: AlertsPanelProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll || !limit ? alerts : alerts.slice(0, limit)

  return (
    <section className="alerts-panel panel panel-glow animate-fade-up">
      <div className="alerts-panel-header">
        <h2 className="font-display">{title}</h2>
        {onEditScanner && (
          <button type="button" className="btn btn-outline edit-scanner" onClick={onEditScanner}>
            <span className="gear">⚙</span> Edit Scanner
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="alerts-empty">
          <p>{emptyHint}</p>
          {onEditScanner && (
            <button type="button" className="btn btn-primary" onClick={onEditScanner}>
              Edit Scanner
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

      {limit && alerts.length > limit && (
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
