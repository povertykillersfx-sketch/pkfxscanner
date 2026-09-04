import type { JournalPoint, SymbolTotal } from '../../tradingJournal'
import { formatMoneyCompact } from '../../tradingJournal'
import './JournalCharts.css'

interface CumulativeChartProps {
  points: JournalPoint[]
}

/** Running P/L line with a soft area fill, coloured by final balance. */
export function CumulativeChart({ points }: CumulativeChartProps) {
  if (points.length === 0) {
    return <p className="chart-empty">Log a trade to see your equity curve.</p>
  }

  const width = 520
  const height = 150
  const padX = 8
  const padY = 12

  const values = points.map((p) => p.value)
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const last = values[values.length - 1] ?? 0
  const tone = last < 0 ? 'loss' : 'profit'

  const x = (i: number) =>
    points.length === 1
      ? padX + (width - padX * 2) / 2
      : padX + (i / (points.length - 1)) * (width - padX * 2)
  const y = (value: number) => padY + ((max - value) / span) * (height - padY * 2)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const zeroY = y(0)
  const area = `${line} L${x(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`

  return (
    <div className={`chart-line tone-${tone}`}>
      <div className="chart-line-axis">
        <span>{formatMoneyCompact(max)}</span>
        <span>{formatMoneyCompact(min)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Cumulative profit and loss">
        <line className="chart-zero" x1={padX} x2={width - padX} y1={zeroY} y2={zeroY} />
        <path className="chart-area" d={area} />
        <path className="chart-stroke" d={line} />
        <circle className="chart-dot" cx={x(points.length - 1)} cy={y(last)} r={3.5} />
      </svg>
    </div>
  )
}

export interface DonutSegment {
  value: number
  tone: 'profit' | 'loss' | 'neutral'
}

interface DonutProps {
  segments: DonutSegment[]
  label: string
  caption?: string
  /** Ring colour when every segment is zero. */
  emptyTone?: 'profit' | 'loss' | 'neutral'
}

/** Ring split proportionally between segments, e.g. wins vs losses. */
export function DonutChart({ segments, label, caption, emptyTone = 'neutral' }: DonutProps) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)

  let offset = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((segment, i) => {
      const dash = (segment.value / total) * circumference
      const arc = (
        <circle
          key={`${segment.tone}-${i}`}
          className={`donut-value tone-${segment.tone}`}
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={-offset}
          transform="rotate(-90 60 60)"
        />
      )
      offset += dash
      return arc
    })

  return (
    <div className="chart-donut">
      <svg viewBox="0 0 120 120" role="img" aria-label={label}>
        <circle className={`donut-track ${total > 0 ? '' : `is-empty tone-${emptyTone}`}`} cx="60" cy="60" r={radius} />
        {arcs}
      </svg>
      <div className="chart-donut-center">
        <strong>{label}</strong>
        {caption ? <span>{caption}</span> : null}
      </div>
    </div>
  )
}

interface SymbolBarsProps {
  rows: SymbolTotal[]
  limit?: number
}

/** Horizontal bars of P/L per instrument, scaled to the largest absolute value. */
export function SymbolBars({ rows, limit = 5 }: SymbolBarsProps) {
  if (rows.length === 0) {
    return <p className="chart-empty">No instruments logged yet.</p>
  }

  const visible = rows.slice(0, limit)
  const peak = Math.max(...visible.map((r) => Math.abs(r.total)), 1)

  return (
    <ul className="chart-symbols">
      {visible.map((row) => (
        <li key={row.symbol}>
          <span className="chart-symbol-name">{row.symbol}</span>
          <span className="chart-symbol-track">
            <span
              className={`chart-symbol-bar ${row.total < 0 ? 'is-loss' : 'is-profit'}`}
              style={{ width: `${Math.max(4, (Math.abs(row.total) / peak) * 100)}%` }}
            />
          </span>
          <span className={`chart-symbol-value ${row.total < 0 ? 'is-loss' : 'is-profit'}`}>
            {formatMoneyCompact(row.total)}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface DailyBarsProps {
  points: JournalPoint[]
}

/**
 * Vertical bars of daily P/L. Winning and losing days share a zero baseline
 * only when both are present, so a single-sided month uses the full height.
 */
export function DailyBars({ points }: DailyBarsProps) {
  if (points.length === 0) {
    return <p className="chart-empty">No trading days logged yet.</p>
  }

  const visible = points.slice(-14)
  const peak = Math.max(...visible.map((p) => Math.abs(p.value)), 1)
  const hasProfit = visible.some((p) => p.value > 0)
  const hasLoss = visible.some((p) => p.value < 0)
  const split = hasProfit && hasLoss

  return (
    <div className={`chart-daily ${split ? 'is-split' : 'is-single'}`} role="img" aria-label="Daily profit and loss">
      {visible.map((point) => {
        const height = Math.max(6, (Math.abs(point.value) / peak) * 100)
        const isLoss = point.value < 0
        const bar = (
          <span
            className={`chart-daily-bar ${isLoss ? 'is-loss' : 'is-profit'}`}
            style={{ height: `${height}%` }}
          />
        )

        return (
          <div
            key={point.date}
            className="chart-daily-col"
            title={`${point.date} · ${formatMoneyCompact(point.value)}`}
          >
            {split ? (
              <>
                <div className="chart-daily-half up">{!isLoss && bar}</div>
                <div className="chart-daily-half down">{isLoss && bar}</div>
              </>
            ) : (
              <div className={`chart-daily-half ${hasLoss ? 'down' : 'up'}`}>{bar}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
