import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  GripVertical,
  Heart,
  Rocket,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import type { Alert } from '../data/mockData'
import { tradingViewSymbol } from '../data/mockData'
import './ChartModal.css'

interface ChartModalProps {
  alert: Alert
  onClose: () => void
}

export function ChartModal({ alert, onClose }: ChartModalProps) {
  const symbol = tradingViewSymbol(alert.asset)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useId().replace(/:/g, '')
  const [floatOpen, setFloatOpen] = useState(true)
  const [favorited, setFavorited] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('chart-open')
    return () => {
      document.body.style.overflow = prev
      document.documentElement.classList.remove('chart-open')
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.innerHTML = ''

    const widgetHost = document.createElement('div')
    widgetHost.className = 'tradingview-widget-container__widget'
    widgetHost.id = `tv_chart_${widgetId}`
    el.appendChild(widgetHost)

    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      backgroundColor: theme === 'light' ? '#ffffff' : '#0a0218',
      gridColor: theme === 'light' ? 'rgba(15, 23, 42, 0.06)' : 'rgba(191, 0, 255, 0.08)',
      toolbar_bg: theme === 'light' ? '#f8fafc' : '#120424',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      /** Left drawings toolbar (trendlines, fibs, shapes, etc.) */
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: true,
      calendar: true,
      details: true,
      hotlist: false,
      show_popup_button: true,
      withdateranges: true,
      watchlist: false,
      studies: ['STD;SMA', 'Volume@tv-basicstudies'],
      support_host: 'https://www.tradingview.com',
    })
    el.appendChild(script)

    return () => {
      el.innerHTML = ''
    }
  }, [symbol, widgetId])

  const isBearish = alert.sentiment === 'Bearish'

  return createPortal(
    <div className="chart-desktop" role="dialog" aria-modal="true" aria-labelledby="chart-desktop-title">
      <header className="chart-desktop-bar">
        <h2 id="chart-desktop-title" className="font-display">
          {alert.asset}
          <span className="chart-symbol"> · Full TradingView</span>
        </h2>
        <div className="chart-desktop-actions">
          {!floatOpen && (
            <button type="button" className="btn btn-outline chart-show-alert" onClick={() => setFloatOpen(true)}>
              Show alert
            </button>
          )}
          <a
            className="chart-open-tv"
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in TradingView ↗
          </a>
          <button type="button" className="chart-desktop-close" aria-label="Close chart" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="chart-desktop-frame tradingview-widget-container" ref={containerRef} />

      {floatOpen && (
        <FloatingAlertPanel
          alert={alert}
          isBearish={isBearish}
          favorited={favorited}
          onFavorite={() => setFavorited((v) => !v)}
          onClose={() => setFloatOpen(false)}
        />
      )}
    </div>,
    document.body,
  )
}

interface FloatingAlertPanelProps {
  alert: Alert
  isBearish: boolean
  favorited: boolean
  onFavorite: () => void
  onClose: () => void
}

function FloatingAlertPanel({
  alert,
  isBearish,
  favorited,
  onFavorite,
  onClose,
}: FloatingAlertPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const [pos, setPos] = useState({ x: 24, y: 72 })

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pos.x, pos.y])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!dragging.current) return
    const panel = panelRef.current
    const w = panel?.offsetWidth ?? 320
    const h = panel?.offsetHeight ?? 280
    const nextX = Math.min(Math.max(8, e.clientX - dragOffset.current.x), window.innerWidth - w - 8)
    const nextY = Math.min(Math.max(8, e.clientY - dragOffset.current.y), window.innerHeight - h - 8)
    setPos({ x: nextX, y: nextY })
  }, [])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    dragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <aside
      ref={panelRef}
      className="floating-alert panel panel-glow"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <header className="floating-alert-head">
        <span className="floating-drag" aria-hidden>
          <GripVertical size={16} />
        </span>
        <span className="alert-asset">{alert.asset}</span>
        <span className={`badge ${isBearish ? 'badge-bearish' : 'badge-bullish'}`}>
          {alert.sentiment}
        </span>
        <span className="alert-session">{alert.session}</span>
        <span className={`trend-orb ${isBearish ? 'down' : 'up'}`}>
          {isBearish ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        </span>
        <button type="button" className="floating-close" aria-label="Close alert panel" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      <div className="floating-alert-body">
        <div className="floating-meta">
          <span>
            {alert.session} · {alert.strategy}
          </span>
          <span>{alert.date}</span>
        </div>

        {alert.aiNote && <p className="floating-ai-note">{alert.aiNote}</p>}

        {alert.trending && (
          <div className="trending-label">
            <Rocket size={14} />
            <span>CURRENT SIGNAL · {alert.session}</span>
          </div>
        )}

        {alert.entry && (
          <p className="floating-entry">
            Entry noticed: <strong>{alert.entry}</strong>
          </p>
        )}

        <div className="levels-grid">
          <div className="levels-col">
            <h4>Possible Targets</h4>
            {alert.targets.map((t) => (
              <div key={`t-${t}`} className="level-bar target">
                {t}
              </div>
            ))}
          </div>
          <div className="levels-col">
            <h4>Possible Reversals</h4>
            {alert.reversals.map((r) => (
              <div key={`r-${r}`} className="level-bar reversal">
                {r}
              </div>
            ))}
          </div>
        </div>

        <div className="alert-actions">
          <button
            type="button"
            className={`fav-btn ${favorited ? 'on' : ''}`}
            aria-label="Favorite"
            onClick={onFavorite}
          >
            <Heart size={18} fill={favorited ? 'currentColor' : 'none'} />
          </button>
          <span className="floating-hint">Drag to move</span>
        </div>
      </div>
    </aside>
  )
}
