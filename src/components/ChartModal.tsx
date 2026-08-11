import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  dispose,
  init,
  type Chart,
  type Period,
} from 'klinecharts'
import {
  Circle,
  Crosshair,
  Eraser,
  GripVertical,
  Heart,
  Minus,
  MousePointer2,
  MoveUpRight,
  Pencil,
  Rocket,
  Slash,
  Spline,
  Square,
  Tag,
  TrendingDown,
  TrendingUp,
  Type,
  X,
} from 'lucide-react'
import type { Alert } from '../data/mockData'
import { tradingViewSymbol } from '../data/mockData'
import { fetchCandles, type ChartInterval } from '../marketData'
import './ChartModal.css'

interface ChartModalProps {
  alert: Alert
  onClose: () => void
}

type DrawingTool =
  | 'segment'
  | 'rayLine'
  | 'straightLine'
  | 'horizontalStraightLine'
  | 'horizontalRayLine'
  | 'verticalStraightLine'
  | 'priceLine'
  | 'fibonacciLine'
  | 'parallelStraightLine'
  | 'priceChannelLine'
  | 'rect'
  | 'circle'
  | 'brush'
  | 'simpleAnnotation'
  | 'simpleTag'
  | null

const DRAW_TOOLS: { id: Exclude<DrawingTool, null>; label: string; icon: typeof Slash }[] = [
  { id: 'segment', label: 'Trend line', icon: Slash },
  { id: 'rayLine', label: 'Ray', icon: MoveUpRight },
  { id: 'straightLine', label: 'Extended line', icon: Minus },
  { id: 'horizontalStraightLine', label: 'Horizontal line', icon: Minus },
  { id: 'horizontalRayLine', label: 'Horizontal ray', icon: MoveUpRight },
  { id: 'verticalStraightLine', label: 'Vertical line', icon: Minus },
  { id: 'priceLine', label: 'Price line', icon: Crosshair },
  { id: 'fibonacciLine', label: 'Fibonacci', icon: Spline },
  { id: 'parallelStraightLine', label: 'Parallel lines', icon: Minus },
  { id: 'priceChannelLine', label: 'Price channel', icon: Minus },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'brush', label: 'Brush', icon: Pencil },
  { id: 'simpleAnnotation', label: 'Text', icon: Type },
  { id: 'simpleTag', label: 'Price tag', icon: Tag },
]

const TIMEFRAMES: { id: ChartInterval; label: string; period: Period }[] = [
  { id: '15m', label: '15m', period: { type: 'minute', span: 15 } },
  { id: '60m', label: '1H', period: { type: 'hour', span: 1 } },
  { id: '240m', label: '4H', period: { type: 'hour', span: 4 } },
  { id: '1d', label: '1D', period: { type: 'day', span: 1 } },
]

export function ChartModal({ alert, onClose }: ChartModalProps) {
  const symbol = tradingViewSymbol(alert.asset)
  const chartElRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const intervalRef = useRef<ChartInterval>('60m')
  const activeToolRef = useRef<DrawingTool>('segment')
  const [floatOpen, setFloatOpen] = useState(true)
  const [favorited, setFavorited] = useState(false)
  const [activeTool, setActiveTool] = useState<DrawingTool>('segment')
  const [interval, setInterval] = useState<ChartInterval>('60m')
  const [status, setStatus] = useState('Loading chart…')
  activeToolRef.current = activeTool

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
    const el = chartElRef.current
    if (!el) return

    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    const chart = init(el, {
      styles: theme === 'dark' ? darkStyles() : lightStyles(),
    })
    if (!chart) return
    chartRef.current = chart

    const precision = ['GOLD', 'US30', 'NASDAQ', 'USDJPY', 'USDZAR'].includes(alert.asset) ? 2 : 4
    chart.setSymbol({ ticker: alert.asset, pricePrecision: precision, volumePrecision: 0 })
    chart.setPeriod({ type: 'hour', span: 1 })
    chart.createIndicator('MA', false)
    chart.createIndicator('VOL')

    let cancelled = false
    setStatus('Loading market data…')

    chart.setDataLoader({
      getBars: async ({ callback }) => {
        const candles = await fetchCandles(alert.asset, intervalRef.current)
        if (cancelled) return
        callback(candles)
        setStatus('')
        if (activeToolRef.current) {
          chart.createOverlay(activeToolRef.current)
        }
      },
    })

    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      dispose(el)
      chartRef.current = null
    }
  }, [alert.asset])


  function selectTool(tool: DrawingTool) {
    const chart = chartRef.current
    if (!chart) return
    setActiveTool(tool)
    if (tool) chart.createOverlay(tool)
  }

  function clearDrawings() {
    chartRef.current?.removeOverlay()
    setActiveTool(null)
  }

  function changeInterval(next: ChartInterval) {
    const chart = chartRef.current
    const tf = TIMEFRAMES.find((t) => t.id === next)
    if (!chart || !tf) return
    intervalRef.current = next
    setInterval(next)
    setStatus('Loading market data…')
    chart.setPeriod(tf.period)
    chart.resetData()
  }

  const isBearish = alert.sentiment === 'Bearish'

  return createPortal(
    <div className="chart-desktop" role="dialog" aria-modal="true" aria-labelledby="chart-desktop-title">
      <header className="chart-desktop-bar">
        <h2 id="chart-desktop-title" className="font-display">
          {alert.asset}
          <span className="chart-symbol"> · Full chart + drawings</span>
        </h2>
        <div className="chart-tf-group" role="group" aria-label="Timeframes">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              className={`chart-tf ${interval === tf.id ? 'active' : ''}`}
              onClick={() => changeInterval(tf.id)}
            >
              {tf.label}
            </button>
          ))}
        </div>
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

      <div className="chart-workspace">
        <aside className="draw-toolbar" aria-label="Drawing tools">
          <button
            type="button"
            className={`draw-tool ${activeTool === null ? 'active' : ''}`}
            title="Cursor"
            aria-label="Cursor"
            onClick={() => setActiveTool(null)}
          >
            <MousePointer2 size={16} />
          </button>
          <button
            type="button"
            className="draw-tool"
            title="Crosshair"
            aria-label="Crosshair"
            onClick={() => setActiveTool(null)}
          >
            <Crosshair size={16} />
          </button>
          <div className="draw-sep" />
          {DRAW_TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`draw-tool ${activeTool === id ? 'active' : ''}`}
              title={label}
              aria-label={label}
              onClick={() => selectTool(id)}
            >
              <Icon size={16} />
            </button>
          ))}
          <div className="draw-sep" />
          <button
            type="button"
            className="draw-tool danger"
            title="Clear drawings"
            aria-label="Clear drawings"
            onClick={clearDrawings}
          >
            <Eraser size={16} />
          </button>
        </aside>

        <div className="chart-desktop-frame">
          {status && <div className="chart-loading">{status}</div>}
          <div ref={chartElRef} className="chart-kline-host" />
        </div>
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

function darkStyles() {
  return {
    grid: { horizontal: { color: 'rgba(191,0,255,0.08)' }, vertical: { color: 'rgba(191,0,255,0.06)' } },
    candle: {
      bar: { upColor: '#22c55e', downColor: '#ef4444', noChangeColor: '#a78bb8' },
      priceMark: { high: { color: '#c084fc' }, low: { color: '#c084fc' } },
    },
    indicator: { lastValueMark: { text: { color: '#f5e9ff' } } },
    xAxis: { axisLine: { color: 'rgba(191,0,255,0.25)' }, tickText: { color: '#a78bb8' } },
    yAxis: { axisLine: { color: 'rgba(191,0,255,0.25)' }, tickText: { color: '#a78bb8' } },
    crosshair: {
      horizontal: { line: { color: 'rgba(224,64,255,0.55)' }, text: { backgroundColor: '#bf00ff' } },
      vertical: { line: { color: 'rgba(224,64,255,0.55)' }, text: { backgroundColor: '#bf00ff' } },
    },
  }
}

function lightStyles() {
  return {
    grid: { horizontal: { color: 'rgba(15,23,42,0.06)' }, vertical: { color: 'rgba(15,23,42,0.04)' } },
    candle: {
      bar: { upColor: '#16a34a', downColor: '#dc2626', noChangeColor: '#6b7280' },
    },
    xAxis: { tickText: { color: '#6b7280' } },
    yAxis: { tickText: { color: '#6b7280' } },
  }
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
  const [pos, setPos] = useState({ x: 72, y: 72 })

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
