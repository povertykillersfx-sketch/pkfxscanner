import {
  MARKET_SESSIONS,
  MAX_SIGNALS_PER_DAY,
  type Alert,
  type MarketSession,
  type Sentiment,
} from './data/mockData'
import { fetchCandlesResult, type Candle } from './marketData'

const ALERTS_KEY = 'pkfx_live_alerts_v1'
const REFRESH_MS = 25 * 60 * 1000

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function formatPrice(asset: string, value: number): string {
  if (asset === 'USDJPY') return value.toFixed(2)
  if (asset === 'GOLD') return value.toFixed(2)
  if (asset === 'US30' || asset === 'NASDAQ') return value.toFixed(0)
  if (asset === 'USDZAR') return value.toFixed(2)
  return value.toFixed(4)
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return []
  const k = 2 / (period + 1)
  const out: number[] = [values[0]!]
  for (let i = 1; i < values.length; i++) {
    out.push(values[i]! * k + out[i - 1]! * (1 - k))
  }
  return out
}

function atr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return candles[0] ? Math.abs(candles[0].high - candles[0].low) : 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i]!
    const prev = candles[i - 1]!
    trs.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)))
  }
  const slice = trs.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / Math.max(slice.length, 1)
}

/** Bars to weight for a given session (hourly). */
function sessionLookback(session: MarketSession): number {
  switch (session) {
    case 'Sydney':
      return 6
    case 'Asian':
      return 8
    case 'London':
      return 8
    case 'New York':
      return 7
    default:
      return 8
  }
}

export interface MarketSignal {
  sentiment: Sentiment
  strategy: string
  entry: string
  targets: string[]
  reversals: string[]
  aiNote: string
  live: boolean
  changePct: number
}

/** Build a directional signal from live (or fallback) candles — no OpenAI required. */
export function analyzeMarket(
  asset: string,
  session: MarketSession,
  candles: Candle[],
  live: boolean,
): MarketSignal {
  const lookback = sessionLookback(session)
  const window = candles.slice(-Math.max(lookback + 5, 20))
  const closes = window.map((c) => c.close)
  const last = window[window.length - 1]!
  const first = window[Math.max(0, window.length - lookback)]!
  const changePct = ((last.close - first.open) / first.open) * 100
  const range = atr(window, 14)
  const fast = ema(closes, 9)
  const slow = ema(closes, 21)
  const fastNow = fast[fast.length - 1]!
  const slowNow = slow[slow.length - 1]!
  const fastPrev = fast[fast.length - 2] ?? fastNow
  const slowPrev = slow[slow.length - 2] ?? slowNow

  const emaBull = fastNow > slowNow
  const crossUp = fastPrev <= slowPrev && fastNow > slowNow
  const crossDown = fastPrev >= slowPrev && fastNow < slowNow
  const swingHigh = Math.max(...window.slice(-lookback).map((c) => c.high))
  const swingLow = Math.min(...window.slice(-lookback).map((c) => c.low))
  const brokeHigh = last.close > swingHigh * 0.999 && changePct > 0.05
  const brokeLow = last.close < swingLow * 1.001 && changePct < -0.05

  let sentiment: Sentiment = changePct >= 0 && emaBull ? 'Bullish' : 'Bearish'
  let strategy = 'Momentum'

  if (crossUp || brokeHigh) {
    sentiment = 'Bullish'
    strategy = brokeHigh ? 'Breakout' : 'EMA Cross'
  } else if (crossDown || brokeLow) {
    sentiment = 'Bearish'
    strategy = brokeLow ? 'Breakout' : 'EMA Cross'
  } else if (Math.abs(changePct) < 0.08 && range > 0) {
    strategy = 'Range'
    sentiment = last.close >= (swingHigh + swingLow) / 2 ? 'Bullish' : 'Bearish'
  }

  const dir = sentiment === 'Bullish' ? 1 : -1
  const step = Math.max(range, Math.abs(last.close) * 0.0008)
  const entry = last.close
  const targets = [
    formatPrice(asset, entry + dir * step * 1.2),
    formatPrice(asset, entry + dir * step * 2.1),
  ]
  const reversals = [
    formatPrice(asset, entry - dir * step * 0.9),
    formatPrice(asset, entry - dir * step * 1.7),
  ]

  const bias = sentiment === 'Bullish' ? 'buy-side momentum' : 'sell-side pressure'
  const src = live ? 'live market data' : 'cached/fallback prices'
  const aiNote = `PKFX scanned ${src} on ${asset} (${session}): ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}% over the session window, ${strategy.toLowerCase()} bias with ${bias}. Targets use ATR from recent bars.`

  return {
    sentiment,
    strategy,
    entry: formatPrice(asset, entry),
    targets,
    reversals,
    aiNote,
    live,
    changePct,
  }
}

/**
 * Sessions that have already produced (or are due to produce) a signal today.
 * Up to 4/day: Sydney, Asian, London, New York.
 */
export function sessionsDueToday(now = new Date()): MarketSession[] {
  const hour = now.getUTCHours()
  const due: MarketSession[] = []

  for (const session of MARKET_SESSIONS) {
    if (session.id === 'Sydney') {
      if (hour >= session.signalHourUtc || hour < 6) due.push(session.id)
      continue
    }
    if (hour >= session.signalHourUtc) due.push(session.id)
  }

  return due.slice(0, MAX_SIGNALS_PER_DAY)
}

function createSignal(
  asset: string,
  session: MarketSession,
  date: string,
  now: Date,
  analysis: MarketSignal,
): Alert {
  const sessionMeta = MARKET_SESSIONS.find((s) => s.id === session)!
  const noticed = new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      sessionMeta.signalHourUtc,
      now.getUTCMinutes(),
      now.getUTCSeconds(),
    ),
  )
  if (noticed.getTime() > now.getTime()) {
    noticed.setTime(now.getTime())
  }

  return {
    id: `${asset}-${date}-${session}`,
    asset,
    sentiment: analysis.sentiment,
    strategy: analysis.strategy,
    date,
    noticedAt: noticed.toISOString(),
    session,
    trending: session === sessionsDueToday(now).at(-1),
    targets: analysis.targets,
    reversals: analysis.reversals,
    entry: analysis.entry,
    aiNote: analysis.aiNote,
    live: analysis.live,
  }
}

function readStored(): Alert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Alert[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(alerts: Alert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
  window.dispatchEvent(new CustomEvent('pkfx-alerts-change', { detail: alerts }))
}

function shouldRefreshLive(existing: Alert, now: Date, latestSession: MarketSession | undefined): boolean {
  if (existing.session !== latestSession) return false
  const age = now.getTime() - new Date(existing.noticedAt).getTime()
  return age >= REFRESH_MS
}

/**
 * Sync AI alerts for scanner symbols using live market candles.
 * - Up to 4 signals/day per symbol (one per session)
 * - Direction/levels come from price action (EMA/ATR/breakout) — OpenAI not required
 * - Current session signal refreshes periodically from live prices
 * - Viewing never deletes; older sessions stay until replaced next day
 */
export async function syncAlertsForSymbols(symbols: string[], now = new Date()): Promise<Alert[]> {
  const date = utcDateKey(now)
  const dueSessions = sessionsDueToday(now)
  const latestSession = dueSessions.at(-1)
  const stored = readStored()

  const bySessionKey = new Map<string, Alert>()
  for (const alert of stored) {
    if (!symbols.includes(alert.asset)) continue
    const key = `${alert.asset}|${alert.session}`
    const existing = bySessionKey.get(key)
    if (!existing || new Date(alert.noticedAt) >= new Date(existing.noticedAt)) {
      bySessionKey.set(key, alert)
    }
  }

  const market = await Promise.all(
    symbols.map(async (asset) => {
      const result = await fetchCandlesResult(asset, '60m')
      return [asset, result] as const
    }),
  )
  const byAsset = new Map(market)

  for (const asset of symbols) {
    const feed = byAsset.get(asset)
    if (!feed) continue
    const analysisCache = new Map<MarketSession, MarketSignal>()

    for (const session of dueSessions) {
      const key = `${asset}|${session}`
      const existing = bySessionKey.get(key)
      const needsCreate = !existing || existing.date !== date
      const needsRefresh = existing && existing.date === date && shouldRefreshLive(existing, now, latestSession)

      if (!needsCreate && !needsRefresh) {
        if (existing) {
          bySessionKey.set(key, {
            ...existing,
            trending: session === latestSession,
          })
        }
        continue
      }

      let analysis = analysisCache.get(session)
      if (!analysis) {
        analysis = analyzeMarket(asset, session, feed.candles, feed.live)
        analysisCache.set(session, analysis)
      }

      const base = createSignal(asset, session, date, now, analysis)
      bySessionKey.set(key, {
        ...base,
        // Keep original notice time for first fire; bump on live refresh of current session
        noticedAt: needsRefresh && existing ? now.toISOString() : base.noticedAt,
        id: existing?.date === date ? existing.id : base.id,
      })
    }
  }

  const next = [...bySessionKey.values()].sort(
    (a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime(),
  )

  writeStored(next)
  return next
}

/** Sync wrapper kept for callers that still expect sync reads of last stored state. */
export function getAlerts(): Alert[] {
  return readStored().sort(
    (a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime(),
  )
}

/** Prefer async syncAlertsForSymbols for live market reads. */
export function getAlertsForSymbols(symbols: string[]): Alert[] {
  // Return stored immediately; kick a background live sync if symbols present.
  void syncAlertsForSymbols(symbols)
  return getAlerts().filter((a) => symbols.includes(a.asset))
}

/** Latest AI signal for a symbol (for chart / preview targets) */
export function getCurrentSignal(asset: string): Alert | null {
  const alerts = getAlerts().filter((a) => a.asset === asset)
  return alerts[0] ?? null
}

export function formatSessionTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
