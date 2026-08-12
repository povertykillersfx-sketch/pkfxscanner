import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  Copy,
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

const SA_TIMEZONE = 'Africa/Johannesburg'

interface ChartModalProps {
  alert: Alert
  onClose: () => void
}

function buildTvEmbedSrc(symbol: string, theme: 'light' | 'dark'): string {
  const params = new URLSearchParams({
    frameElementId: 'pkfx-tv-frame',
    symbol,
    interval: '15',
    hidesidetoolbar: '0',
    hidetoptoolbar: '0',
    symboledit: '0',
    saveimage: '1',
    toolbarbg: theme === 'light' ? 'f8fafc' : '120424',
    studies: '[]',
    theme,
    style: '1',
    timezone: SA_TIMEZONE,
    withdateranges: '1',
    hideideas: '1',
    hidevolume: '0',
    locale: 'en',
    details: '1',
    calendar: '0',
    hotlist: '0',
    allow_symbol_change: '0',
  })
  return `https://s.tradingview.com/widgetembed/?${params.toString()}`
}

export function ChartModal({ alert, onClose }: ChartModalProps) {
  const symbol = tradingViewSymbol(alert.asset)
  const [floatOpen, setFloatOpen] = useState(true)
  const [favorited, setFavorited] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const theme = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  const embedSrc = buildTvEmbedSrc(symbol, theme)

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
    setReady(false)
    setError('')
  }, [symbol, embedSrc])

  const isBearish = alert.sentiment === 'Bearish'
  const openInTvHref = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=15&timezone=${encodeURIComponent(SA_TIMEZONE)}`

  return createPortal(
    <div className="chart-desktop" role="dialog" aria-modal="true" aria-labelledby="chart-desktop-title">
      <header className="chart-desktop-bar">
        <h2 id="chart-desktop-title" className="font-display">
          {alert.asset}
          <span className="chart-symbol"> · TradingView · SAST (UTC+2)</span>
        </h2>
        <div className="chart-desktop-actions">
          {!floatOpen && (
            <button type="button" className="btn btn-outline chart-show-alert" onClick={() => setFloatOpen(true)}>
              Show alert
            </button>
          )}
          <a className="chart-open-tv" href={openInTvHref} target="_blank" rel="noreferrer">
            Open in TradingView ↗
          </a>
          <button type="button" className="chart-desktop-close" aria-label="Close chart" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="chart-desktop-frame">
        {!ready && !error && <div className="chart-loading">Loading TradingView (SAST)…</div>}
        {error && <div className="chart-loading chart-error">{error}</div>}
        <iframe
          key={embedSrc}
          title={`${alert.asset} TradingView chart`}
          className="chart-tv-iframe"
          src={embedSrc}
          allow="fullscreen"
          onLoad={() => {
            setReady(true)
            setError('')
          }}
          onError={() => setError('Could not load TradingView. Try Open in TradingView.')}
        />
      </div>

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

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      resolve()
    } catch (err) {
      reject(err)
    }
  })
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
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

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

  async function copyValue(value: string) {
    try {
      await copyText(value)
      setCopiedValue(value)
      window.setTimeout(() => setCopiedValue((cur) => (cur === value ? null : cur)), 1400)
    } catch {
      /* ignore */
    }
  }

  function CopyLevelButton({ value }: { value: string }) {
    const justCopied = copiedValue === value
    return (
      <button
        type="button"
        className="level-copy-btn"
        aria-label={`Copy ${value}`}
        title={justCopied ? 'Copied' : 'Copy'}
        onClick={() => void copyValue(value)}
      >
        {justCopied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    )
  }

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
        {alert.trending && (
          <span className="current-dot" title="Current running trade" aria-label="Current running trade" />
        )}
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
          <p className="floating-entry level-bar-copyable">
            <span>
              15m entry: <strong>{alert.entry}</strong>
            </span>
            <CopyLevelButton value={alert.entry} />
          </p>
        )}

        <div className="levels-grid">
          <div className="levels-col">
            <h4>Possible Targets</h4>
            {alert.targets.map((t) => (
              <div key={`t-${t}`} className="level-bar target level-bar-copyable">
                <span>{t}</span>
                <CopyLevelButton value={t} />
              </div>
            ))}
          </div>
          <div className="levels-col">
            <h4>Possible Reversals</h4>
            {alert.reversals.map((r) => (
              <div key={`r-${r}`} className="level-bar reversal level-bar-copyable">
                <span>{r}</span>
                <CopyLevelButton value={r} />
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
          <span className="floating-hint">Drag to move · SAST chart</span>
        </div>
      </div>
    </aside>
  )
}
