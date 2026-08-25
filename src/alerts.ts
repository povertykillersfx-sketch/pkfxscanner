import {
  MARKET_SESSIONS,
  MAX_SIGNALS_PER_DAY,
  type Alert,
  type MarketSession,
  type Sentiment,
} from './data/mockData'
import {
  fetchMultiTimeframe,
  type Candle,
  type MultiTimeframeFeed,
} from './marketData'

/** Locked session signals — one alert per symbol/session/day (levels never rewrite) */
const ALERTS_KEY = 'pkfx_live_alerts_v15_session_price_at_open'
/** Keep past alerts on My Alerts for this many FX trading days (including today). */
const ALERT_HISTORY_TRADING_DAYS = 5
/** Minutes into a session used for the opening scan snapshot. */
const SESSION_SCAN_GRACE_MIN = 10
/** Extra minutes after grace where a session still locks to live arrival price. */
const LIVE_ARRIVAL_BUFFER_MIN = 25
/** Max distance from session scan time to accept an OHLC bar as that alert's market. */
const SESSION_PRICE_MAX_LAG_MS = 40 * 60 * 1000

/** Assets where Yahoo OHLC venue differs from the TradingView chart. */
const CHART_BASIS_ASSETS = new Set(['GOLD', 'US30', 'NASDAQ'])

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function shiftUtcDays(d: Date, delta: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + delta)
  return next
}

/**
 * Last N FX trading days as UTC date keys (Mon–Fri).
 * Also keeps the Sunday key used by Sydney week-open alerts.
 */
export function recentTradingDateKeys(
  now = new Date(),
  tradingDays = ALERT_HISTORY_TRADING_DAYS,
): Set<string> {
  const keys = new Set<string>()
  let counted = 0
  // Noon UTC cursor avoids DST edge cases when walking calendar days
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12))

  for (let guard = 0; guard < 21 && counted < tradingDays; guard++) {
    const dow = cursor.getUTCDay()
    if (dow >= 1 && dow <= 5) {
      keys.add(utcDateKey(cursor))
      counted += 1
      // Monday’s Sydney open is stamped on Sunday UTC
      if (dow === 1) {
        keys.add(utcDateKey(shiftUtcDays(cursor, -1)))
      }
    }
    cursor = shiftUtcDays(cursor, -1)
  }

  // Sunday after Sydney open counts as the start of the trading week
  if (now.getUTCDay() === 0 && now.getUTCHours() >= 22) {
    keys.add(utcDateKey(now))
  }

  return keys
}

/** Date keys that belong to the current trading day (all sessions due so far). */
export function currentTradingDateKeys(now = new Date()): Set<string> {
  const keys = new Set<string>()
  const due = sessionsDueToday(now)
  if (due.length > 0) {
    for (const session of due) keys.add(alertDateForSession(session, now))
    return keys
  }
  if (!isAlertWeekday(now)) return keys

  keys.add(utcDateKey(now))
  const dow = now.getUTCDay()
  if (dow === 1 || (dow === 0 && now.getUTCHours() >= 22)) {
    const sydneyDay = dow === 1 ? shiftUtcDays(now, -1) : now
    keys.add(utcDateKey(sydneyDay))
  }
  return keys
}

function isRecentAlert(alert: Alert, now = new Date(), tradingDays = ALERT_HISTORY_TRADING_DAYS): boolean {
  const window = recentTradingDateKeys(now, tradingDays)
  if (alert.date && window.has(alert.date)) return true
  const t = new Date(alert.noticedAt).getTime()
  if (!Number.isFinite(t)) return false
  // Fallback: keep ~2 calendar weeks max when date is missing
  const cutoff = shiftUtcDays(now, -(tradingDays * 2))
  cutoff.setUTCHours(0, 0, 0, 0)
  return t >= cutoff.getTime()
}

function formatPrice(asset: string, value: number): string {
  if (asset === 'USDJPY') return value.toFixed(2)
  if (asset === 'GOLD') return value.toFixed(2)
  if (asset === 'US30' || asset === 'NASDAQ') return value.toFixed(0)
  if (asset === 'USDZAR') return value.toFixed(2)
  return value.toFixed(4)
}

/**
 * Instrument risk budget: stop distance room + TP room for a clean 1:1 / 1:2 R:R.
 * Caps still prevent wild multi-hour ranges from blowing out levels.
 */
function levelBudget(asset: string, entry: number, atr15: number): {
  /** Typical 15m noise / min stop padding */
  tick: number
  /** Max stop distance from entry (1R cap) */
  maxStop: number
  /** Max TP1 distance (= 1R, mirrors maxStop) */
  maxTp1: number
  /** Max TP2 distance (= 2R) */
  maxTp2: number
  /** Working ATR clipped to instrument norms */
  step: number
} {
  const px = Math.abs(entry) || 1
  // Soft ATR clip (~0.07% of price)
  const atrCap = px * 0.0007
  let step = Math.min(Math.max(atr15, px * 0.00012), atrCap)

  switch (asset) {
    case 'USDJPY': {
      step = Math.min(Math.max(step, 0.04), 0.16)
      const maxStop = 0.28
      return { tick: 0.01, maxStop, maxTp1: maxStop, maxTp2: maxStop * 2, step }
    }
    case 'USDZAR': {
      step = Math.min(Math.max(step, 0.04), 0.18)
      const maxStop = 0.4
      return { tick: 0.01, maxStop, maxTp1: maxStop, maxTp2: maxStop * 2, step }
    }
    case 'GOLD': {
      step = Math.min(Math.max(step, 1.0), 3.5)
      const maxStop = 9
      return { tick: 0.1, maxStop, maxTp1: maxStop, maxTp2: maxStop * 2, step }
    }
    case 'US30': {
      step = Math.min(Math.max(step, 35), 100)
      const maxStop = 200
      return { tick: 1, maxStop, maxTp1: maxStop, maxTp2: maxStop * 2, step }
    }
    case 'NASDAQ': {
      step = Math.min(Math.max(step, 25), 90)
      const maxStop = 160
      return { tick: 1, maxStop, maxTp1: maxStop, maxTp2: maxStop * 2, step }
    }
    default: {
      // Majors / crosses (~12–30 pips stop room)
      step = Math.min(Math.max(step, 0.0003), 0.001)
      const maxStop = 0.003
      return { tick: 0.0001, maxStop, maxTp1: maxStop, maxTp2: maxStop * 2, step }
    }
  }
}

function clampDist(distance: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, distance))
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

/** Local swing pivots (N bars either side) — more accurate than window max/min. */
function pivotLevels(candles: Candle[], left = 2, right = 2): { highs: number[]; lows: number[] } {
  const highs: number[] = []
  const lows: number[] = []
  if (candles.length < left + right + 1) {
    return {
      highs: candles.length ? [Math.max(...candles.map((c) => c.high))] : [],
      lows: candles.length ? [Math.min(...candles.map((c) => c.low))] : [],
    }
  }
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i]!
    let isHigh = true
    let isLow = true
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue
      if (candles[j]!.high > c.high) isHigh = false
      if (candles[j]!.low < c.low) isLow = false
    }
    if (isHigh) highs.push(c.high)
    if (isLow) lows.push(c.low)
  }
  if (!highs.length) highs.push(Math.max(...candles.map((c) => c.high)))
  if (!lows.length) lows.push(Math.min(...candles.map((c) => c.low)))
  return { highs, lows }
}

function sessionLookbackHours(session: MarketSession): number {
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

interface TfRead {
  sentiment: Sentiment
  score: number
  changePct: number
  swingHigh: number
  swingLow: number
  pivotHighs: number[]
  pivotLows: number[]
  atr: number
  lastClose: number
  emaBull: boolean
  emaSeparationPct: number
  rsi: number
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

/** Bias / structure read — ATR-aware score, EMA slope, RSI, true pivots. */
function readTimeframe(candles: Candle[], lookbackBars: number): TfRead {
  const window = candles.slice(-Math.max(lookbackBars + 8, 30))
  const closes = window.map((c) => c.close)
  const last = window[window.length - 1]!
  const first = window[Math.max(0, window.length - lookbackBars)]!
  const changePct = ((last.close - first.open) / Math.max(Math.abs(first.open), 1e-9)) * 100
  const range = Math.max(atr(window, 14), Math.abs(last.close) * 0.00015)
  const fast = ema(closes, 9)
  const slow = ema(closes, 21)
  const fastNow = fast[fast.length - 1]!
  const slowNow = slow[slow.length - 1]!
  const fastPrev = fast[Math.max(0, fast.length - 4)]!
  const slowPrev = slow[Math.max(0, slow.length - 4)]!
  const emaBull = fastNow > slowNow
  const emaRising = fastNow > fastPrev && slowNow >= slowPrev
  const emaFalling = fastNow < fastPrev && slowNow <= slowPrev
  const emaSeparationPct = ((fastNow - slowNow) / Math.max(Math.abs(slowNow), 1e-9)) * 100
  const look = window.slice(-lookbackBars)
  const pivots = pivotLevels(look, 2, 2)
  const swingHigh = Math.max(...look.map((c) => c.high))
  const swingLow = Math.min(...look.map((c) => c.low))
  const mid = (swingHigh + swingLow) / 2
  const rsiNow = rsi(closes, 14)
  const momentumAtr = (last.close - first.open) / range

  let score = 0
  if (emaBull) score += 2
  else score -= 2
  if (emaRising) score += 1
  else if (emaFalling) score -= 1
  if (emaSeparationPct > 0.04) score += 1
  else if (emaSeparationPct < -0.04) score -= 1
  if (momentumAtr > 0.35) score += 2
  else if (momentumAtr < -0.35) score -= 2
  else if (changePct > 0.08) score += 1
  else if (changePct < -0.08) score -= 1
  if (last.close > mid) score += 1
  else if (last.close < mid) score -= 1
  if (last.close > slowNow) score += 1
  else score -= 1
  if (rsiNow >= 55 && rsiNow <= 75) score += 1
  else if (rsiNow <= 45 && rsiNow >= 25) score -= 1
  else if (rsiNow > 78) score -= 1
  else if (rsiNow < 22) score += 1

  const sentiment: Sentiment = score > 0 ? 'Bullish' : score < 0 ? 'Bearish' : emaBull ? 'Bullish' : 'Bearish'
  return {
    sentiment,
    score,
    changePct,
    swingHigh,
    swingLow,
    pivotHighs: pivots.highs,
    pivotLows: pivots.lows,
    atr: range,
    lastClose: last.close,
    emaBull,
    emaSeparationPct,
    rsi: rsiNow,
  }
}

/**
 * Entry = market price at lock time (live arrival or session snapshot).
 * Caller must pass the correct spot for that lock mode.
 */
function entryFrom15m(
  m15: Candle[],
  _sentiment: Sentiment,
  marketPrice?: number,
): {
  entry: number
  microSwingHigh: number
  microSwingLow: number
  atr15: number
  awaitingPullback: boolean
  market: number
} {
  const window = m15.slice(-40)
  const closes = window.map((c) => c.close)
  const last = window[window.length - 1]!
  const slow = ema(closes, 21)
  const ema21 = slow[slow.length - 1]!
  const rawAtr = Math.max(atr(window, 14), Math.abs(last.close) * 0.00012)
  // Last ~90m of 15m bars — structure for 1R without multi-hour stretch
  const recent = window.slice(-6)
  const microSwingHigh = Math.max(...recent.map((c) => c.high))
  const microSwingLow = Math.min(...recent.map((c) => c.low))

  // Prefer the lock-time spot (live when alert arrives, or session snapshot when backfilling)
  const market =
    marketPrice != null && Number.isFinite(marketPrice) ? marketPrice : last.close

  const stretch = Math.abs(market - ema21)
  const awaitingPullback = stretch > rawAtr * 0.9

  return {
    entry: market,
    microSwingHigh,
    microSwingLow,
    atr15: rawAtr,
    awaitingPullback,
    market,
  }
}

/**
 * SL + targets from entry using a fixed risk:reward plan:
 * - SL = 1R (structure-aware, instrument-capped)
 * - TP1 = 1R (1:1)
 * - TP2 = 2R (1:2)
 */
function levelsFromHtf(
  asset: string,
  sentiment: Sentiment,
  entry: number,
  _h4: TfRead,
  _h1: TfRead,
  m15SwingHigh: number,
  m15SwingLow: number,
  atr15: number,
): { targets: string[]; reversals: string[] } {
  const dir: 1 | -1 = sentiment === 'Bullish' ? 1 : -1
  const { step, maxStop } = levelBudget(asset, entry, atr15)

  // 1R from recent 15m structure, floored by ATR step and capped by instrument max
  const structureRisk =
    sentiment === 'Bullish'
      ? Math.max(entry - m15SwingLow, step * 0.75)
      : Math.max(m15SwingHigh - entry, step * 0.75)

  const risk = clampDist(structureRisk, step * 0.7, maxStop)

  const sl = entry - dir * risk
  const extSl = entry - dir * clampDist(risk * 1.2, risk * 1.05, maxStop * 1.15)
  const tp1 = entry + dir * risk // 1:1
  const tp2 = entry + dir * risk * 2 // 1:2

  return {
    targets: [formatPrice(asset, tp1), formatPrice(asset, tp2)],
    reversals: [formatPrice(asset, sl), formatPrice(asset, extSl)],
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
  spot?: string
  dataSource?: string
}

/**
 * Multi-timeframe signal:
 * - Direction: 4H ∧ 1H preferred; stronger TF only when mixed
 * - Entry: market price at lock (live on arrival, or session snapshot when backfilling)
 * - SL/TP: 1R stop, TP1 at 1:1, TP2 at 1:2 from that entry
 */
export function analyzeMultiTimeframe(
  asset: string,
  session: MarketSession,
  feed: MultiTimeframeFeed,
): MarketSignal {
  const hours = sessionLookbackHours(session)
  const h4 = readTimeframe(feed.h4.candles, Math.max(8, Math.ceil(hours / 4) + 4))
  const h1 = readTimeframe(feed.h1.candles, hours + 4)
  const m15Read = readTimeframe(feed.m15.candles, hours * 4 + 8)

  const aligned = h4.sentiment === h1.sentiment
  const h4Strong = Math.abs(h4.score) >= 3
  const h1Strong = Math.abs(h1.score) >= 3

  // Prefer aligned HTF. If mixed, require the winner to be clearly stronger.
  let sentiment: Sentiment
  if (aligned) {
    sentiment = h4.sentiment
  } else if (Math.abs(h4.score) >= Math.abs(h1.score) + 2) {
    sentiment = h4.sentiment
  } else if (Math.abs(h1.score) >= Math.abs(h4.score) + 2) {
    sentiment = h1.sentiment
  } else {
    // Coin-flip risk — lean 4H (slower bias) but mark low conviction in strategy
    sentiment = h4.sentiment
  }

  const conviction =
    aligned && h4Strong && h1Strong ? 'high' : aligned && (h4Strong || h1Strong) ? 'medium' : aligned ? 'fair' : 'low'

  let strategy = 'MTF Momentum'
  if (aligned && sentiment === 'Bullish' && h1.emaBull) strategy = '4H→1H Bull / 15m Entry'
  else if (aligned && sentiment === 'Bearish' && !h1.emaBull) strategy = '4H→1H Bear / 15m Entry'
  else if (!aligned) strategy = 'MTF Mixed · reduced conviction'
  else strategy = 'HTF Bias · 15m Entry'

  const m15Agrees =
    (sentiment === 'Bullish' && m15Read.score >= 0) || (sentiment === 'Bearish' && m15Read.score <= 0)

  const lastM15 = feed.m15.candles[feed.m15.candles.length - 1]?.close
  const spot = feed.spot != null && Number.isFinite(feed.spot) ? feed.spot : undefined
  // Entry must be the live/chart spot at release — never a stale mid-bar guess
  const marketAtRelease = spot ?? lastM15

  const {
    entry,
    microSwingHigh,
    microSwingLow,
    atr15,
    awaitingPullback,
    market,
  } = entryFrom15m(feed.m15.candles, sentiment, marketAtRelease)

  if (awaitingPullback || !m15Agrees) {
    strategy = `${strategy} (wait pullback)`
  }

  const { targets, reversals } = levelsFromHtf(
    asset,
    sentiment,
    entry,
    h4,
    h1,
    microSwingHigh,
    microSwingLow,
    atr15,
  )

  const bias = sentiment === 'Bullish' ? 'buy-side' : 'sell-side'
  const preciseOhlc = feed.live && feed.source !== 'frankfurter'
  const src = preciseOhlc
    ? `live OHLC (${feed.source})`
    : feed.live
      ? `coarse live feed (${feed.source})`
      : feed.source === 'tradingview-spot'
        ? 'TradingView spot (OHLC fallback)'
        : 'DEMO / synthetic — not live market'

  const entryLabel = formatPrice(asset, entry)
  const marketLabel = formatPrice(asset, market)
  const entryHint = awaitingPullback
    ? `market entry ${entryLabel} (extended — wait pullback for better fill)`
    : `entry ${entryLabel}`
  const aiNote = `PKFX MTF on ${asset} (${session}): 4H ${h4.sentiment.toLowerCase()} (score ${h4.score > 0 ? '+' : ''}${h4.score}, ${h4.changePct >= 0 ? '+' : ''}${h4.changePct.toFixed(2)}%, RSI ${h4.rsi.toFixed(0)}) → 1H ${h1.sentiment.toLowerCase()} (score ${h1.score > 0 ? '+' : ''}${h1.score}) → ${entryHint} · market ${marketLabel}. ${bias} · conviction ${conviction}; SL 1R · TP1 1:1 · TP2 1:2. Feed: ${src}.`

  return {
    sentiment,
    strategy,
    entry: entryLabel,
    targets,
    reversals,
    aiNote,
    live: feed.live,
    changePct: m15Read.changePct,
    // Keep spot identical to entry so the card never shows a mismatched "market"
    spot: entryLabel,
    dataSource: feed.source,
  }
}

/** @deprecated kept for any direct callers — prefer analyzeMultiTimeframe */
export function analyzeMarket(
  asset: string,
  session: MarketSession,
  candles: Candle[],
  live: boolean,
): MarketSignal {
  return analyzeMultiTimeframe(asset, session, {
    h4: { candles, live, source: live ? 'yahoo' : 'synthetic' },
    h1: { candles, live, source: live ? 'yahoo' : 'synthetic' },
    m15: { candles, live, source: live ? 'yahoo' : 'synthetic' },
    live,
    source: live ? 'yahoo' : 'synthetic',
  })
}

/**
 * Sessions that have already opened in the current forex day
 * (from the most recent Sydney 22:00 UTC open through now).
 * New alerts are weekdays only (Mon–Fri; Sunday after Sydney open counts).
 */
export function sessionsDueToday(now = new Date()): MarketSession[] {
  if (!isAlertWeekday(now)) return []

  const cycleStart = sessionOpenUtc('Sydney', now).getTime()
  const due: MarketSession[] = []

  for (const session of MARKET_SESSIONS) {
    const openMs = sessionOpenUtc(session.id, now).getTime()
    if (openMs <= now.getTime() && openMs >= cycleStart - 1000) {
      due.push(session.id)
    }
  }

  due.sort((a, b) => sessionOpenUtc(a, now).getTime() - sessionOpenUtc(b, now).getTime())
  return due.slice(0, MAX_SIGNALS_PER_DAY)
}

/**
 * Active market session right now: the most recently opened
 * Sydney → Asian → London → New York window (by UTC open hour).
 */
export function currentMarketSession(now = new Date()): MarketSession {
  const due = sessionsDueToday(now)
  if (due.length) return due[due.length - 1]!

  let best: MarketSession = 'Sydney'
  let bestMs = -Infinity
  for (const session of MARKET_SESSIONS) {
    const openMs = sessionOpenUtc(session.id, now).getTime()
    if (openMs <= now.getTime() && openMs > bestMs) {
      bestMs = openMs
      best = session.id
    }
  }
  return best
}

/**
 * Whether PKFX should create / send AI alerts right now.
 * Forex week: closed Sat + Sun before Sydney 22:00 UTC; open Sun 22:00 UTC through Fri.
 */
export function isAlertWeekday(now = new Date()): boolean {
  const day = now.getUTCDay() // 0 = Sun … 6 = Sat
  if (day === 6) return false // Saturday
  if (day === 0) return now.getUTCHours() >= 22 // Sunday only after Sydney week open
  return true // Monday–Friday
}

/** UTC timestamp when this session most recently opened (already started). */
export function sessionOpenUtc(session: MarketSession, now = new Date()): Date {
  const meta = MARKET_SESSIONS.find((s) => s.id === session)!
  const open = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), meta.signalHourUtc, 0, 0, 0),
  )
  if (session === 'Sydney') {
    if (now.getUTCHours() < 22) open.setUTCDate(open.getUTCDate() - 1)
  } else if (now.getTime() < open.getTime()) {
    open.setUTCDate(open.getUTCDate() - 1)
  }
  return open
}

/** Calendar date key for the alert bucket of a session open. */
export function alertDateForSession(session: MarketSession, now = new Date()): string {
  return utcDateKey(sessionOpenUtc(session, now))
}

/** Moment used for the session scan: open + grace, capped at now. */
function sessionScanAsOfMs(session: MarketSession, now = new Date()): number {
  const openMs = sessionOpenUtc(session, now).getTime()
  const graceMs = openMs + SESSION_SCAN_GRACE_MIN * 60 * 1000
  return Math.min(now.getTime(), graceMs)
}

function truncateCandles(candles: Candle[], asOfMs: number): Candle[] {
  if (!candles.length) return candles
  let end = -1
  for (let i = 0; i < candles.length; i++) {
    const ts = candles[i]!.timestamp
    if (Number.isFinite(ts) && ts <= asOfMs) end = i
  }
  if (end < 0) return []
  const start = Math.max(0, end - 47)
  return candles.slice(start, end + 1)
}

/**
 * Market price printed at (or just before) the session alert time.
 * Returns undefined when no bar is close enough — caller must skip locking.
 */
function marketPriceAt(candles: Candle[], asOfMs: number): { price: number; barTs: number } | undefined {
  let best: Candle | undefined
  for (const c of candles) {
    if (!Number.isFinite(c.timestamp) || !Number.isFinite(c.close)) continue
    // Accept bars up to one 15m slot after asOf (bar that contains the scan instant)
    if (c.timestamp > asOfMs + 15 * 60 * 1000) continue
    if (!best || c.timestamp >= best.timestamp) best = c
  }
  if (!best) return undefined
  if (Math.abs(best.timestamp - asOfMs) > SESSION_PRICE_MAX_LAG_MS) return undefined
  return { price: best.close, barTs: best.timestamp }
}

/**
 * Align a Yahoo/futures historical print to the chart venue using live basis.
 * GOLD/US30/NASDAQ chart symbols differ from Yahoo OHLC symbols.
 */
function toChartPrice(asset: string, ohlcPrice: number, feed: MultiTimeframeFeed): number {
  if (!CHART_BASIS_ASSETS.has(asset)) return ohlcPrice
  const chartLive = feed.spot
  const ohlcLive = feed.ohlcSpot
  if (
    chartLive != null &&
    ohlcLive != null &&
    Number.isFinite(chartLive) &&
    Number.isFinite(ohlcLive) &&
    ohlcLive > 0
  ) {
    return ohlcPrice * (chartLive / ohlcLive)
  }
  // If we only have chart live and no separate ohlc, keep ohlc historical as-is
  return ohlcPrice
}

/**
 * Snapshot feed at a session's alert time with entry = market at that moment.
 * Uses the OHLC bar nearest the session scan time (not a later live quote).
 */
function feedAsOfSession(
  asset: string,
  feed: MultiTimeframeFeed,
  asOfMs: number,
): MultiTimeframeFeed | null {
  const at = marketPriceAt(feed.m15.candles, asOfMs) ?? marketPriceAt(feed.h1.candles, asOfMs)
  if (!at) return null

  const entryPrice = toChartPrice(asset, at.price, feed)
  const m15Candles = truncateCandles(feed.m15.candles, asOfMs)
  const h1Candles = truncateCandles(feed.h1.candles, asOfMs)
  const h4Candles = truncateCandles(feed.h4.candles, asOfMs)
  if (m15Candles.length < 8 && h1Candles.length < 8) return null

  const pin = (candles: Candle[]) => {
    if (!candles.length) return candles
    const out = candles.map((c) => ({ ...c }))
    const last = out[out.length - 1]!
    last.close = entryPrice
    last.high = Math.max(last.high, entryPrice)
    last.low = Math.min(last.low, entryPrice)
    // Stamp scan time so entry is tied to the alert moment
    last.timestamp = Math.min(asOfMs, Math.max(last.timestamp, at.barTs))
    return out
  }

  const m15 = m15Candles.length ? pin(m15Candles) : pin(feed.m15.candles.slice(-24))
  const h1 = h1Candles.length ? h1Candles : feed.h1.candles.slice(-24)
  const h4 = h4Candles.length ? h4Candles : feed.h4.candles.slice(-16)

  return {
    m15: { ...feed.m15, candles: m15, spot: entryPrice },
    h1: { ...feed.h1, candles: h1, spot: entryPrice },
    h4: { ...feed.h4, candles: h4, spot: entryPrice },
    live: feed.live,
    source: feed.source,
    spot: entryPrice,
    ohlcSpot: at.price,
  }
}

/** Pin last 15m close to live chart spot so entry matches the market when the alert arrives. */
function feedAtLiveArrival(feed: MultiTimeframeFeed): MultiTimeframeFeed | null {
  const liveSpot =
    feed.spot ??
    feed.m15.candles[feed.m15.candles.length - 1]?.close ??
    feed.h1.candles[feed.h1.candles.length - 1]?.close
  if (liveSpot == null || !Number.isFinite(liveSpot)) return null

  const m15 = feed.m15.candles.length
    ? (() => {
        const candles = feed.m15.candles.map((c) => ({ ...c }))
        const last = candles[candles.length - 1]!
        last.close = liveSpot
        last.high = Math.max(last.high, liveSpot)
        last.low = Math.min(last.low, liveSpot)
        return candles
      })()
    : feed.m15.candles

  return {
    ...feed,
    spot: liveSpot,
    m15: { ...feed.m15, candles: m15, spot: liveSpot },
    h1: { ...feed.h1, spot: liveSpot },
    h4: { ...feed.h4, spot: liveSpot },
  }
}

/**
 * Live market lock only while this session is actually arriving
 * (inside open window). The latest session also uses live if still
 * the active due session and within an extended arrival buffer.
 * Older sessions always use their own open-time market print.
 */
function shouldLockToLiveArrival(
  session: MarketSession,
  now: Date,
  latestSession: MarketSession | undefined,
): boolean {
  const openMs = sessionOpenUtc(session, now).getTime()
  const ageMin = (now.getTime() - openMs) / 60_000
  if (ageMin < 0) return false
  // Fresh open window for any session
  if (ageMin <= SESSION_SCAN_GRACE_MIN + LIVE_ARRIVAL_BUFFER_MIN) return true
  // Latest session only stays on live briefly after that (avoid hours-late drift)
  if (latestSession && session === latestSession && ageMin <= 90) return true
  return false
}

function createSignal(
  asset: string,
  session: MarketSession,
  date: string,
  now: Date,
  analysis: MarketSignal,
  options?: { noticedAt?: Date },
): Alert {
  const openAt = sessionOpenUtc(session, now)
  const noticed = options?.noticedAt ? new Date(options.noticedAt) : new Date(openAt)
  if (noticed.getTime() > now.getTime()) {
    noticed.setTime(now.getTime())
  }

  const latestSession = sessionsDueToday(now).at(-1)
  const latestDate = latestSession ? alertDateForSession(latestSession, now) : ''

  return {
    id: `${asset}-${date}-${session}`,
    asset,
    sentiment: analysis.sentiment,
    strategy: analysis.strategy,
    date,
    noticedAt: noticed.toISOString(),
    session,
    trending: session === latestSession && date === latestDate,
    targets: analysis.targets,
    reversals: analysis.reversals,
    entry: analysis.entry,
    aiNote: analysis.aiNote,
    live: analysis.live,
    spot: analysis.spot,
    dataSource: analysis.dataSource,
    levelsLocked: true,
  }
}

/** True when an alert already has immutable trade levels that must never be rewritten. */
function hasLockedLevels(alert: Alert): boolean {
  if (alert.levelsLocked) return true
  return Boolean(
    alert.entry &&
      Array.isArray(alert.targets) &&
      alert.targets.length > 0 &&
      Array.isArray(alert.reversals) &&
      alert.reversals.length > 0,
  )
}

/** Preserve entry/SL/TP forever — only trending (and similar flags) may change. */
function withTrendingOnly(alert: Alert, trending: boolean): Alert {
  return {
    ...alert,
    trending,
    levelsLocked: true,
    entry: alert.entry,
    targets: alert.targets,
    reversals: alert.reversals,
    spot: alert.spot,
    sentiment: alert.sentiment,
    strategy: alert.strategy,
    aiNote: alert.aiNote,
    live: alert.live,
    dataSource: alert.dataSource,
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

/**
 * Sync AI alerts for scanner symbols using multi-timeframe live data.
 * - Arriving session (open window / current): entry = live chart price at lock
 * - Older sessions: entry = market print at that session's open (chart-aligned)
 * - Once locked, entry / SL / TP never change
 * Weekends: no new alerts are created (Sat + Sun before Sydney open).
 */
export async function syncAlertsForSymbols(symbols: string[], now = new Date()): Promise<Alert[]> {
  const dueSessions = sessionsDueToday(now)
  const latestSession = dueSessions.at(-1)
  const latestDate = latestSession ? alertDateForSession(latestSession, now) : ''
  const historyDates = recentTradingDateKeys(now, ALERT_HISTORY_TRADING_DAYS)
  // Also keep Sydney's previous-UTC-day bucket when it is the overnight session
  for (const session of dueSessions) {
    historyDates.add(alertDateForSession(session, now))
  }
  const stored = readStored()
    .filter((a) => isRecentAlert(a, now, ALERT_HISTORY_TRADING_DAYS))
    .map((a) => (hasLockedLevels(a) ? { ...a, levelsLocked: true } : a))

  // Weekend: keep history, do not scan or lock new signals
  if (!isAlertWeekday(now)) {
    const kept = stored.map((a) => withTrendingOnly(a, false))
    const next = organizeAlertsForScanner(
      kept.filter((a) => symbols.includes(a.asset)),
      symbols,
      now,
    )
    const organizedIds = new Set(next.map((a) => a.id))
    const preserved = kept.filter((a) => !organizedIds.has(a.id))
    writeStored([...preserved, ...next])
    return next
  }
  const byId = new Map<string, Alert>()
  for (const alert of stored) {
    byId.set(alert.id, alert)
  }

  const bySessionKey = new Map<string, Alert>()
  for (const alert of stored) {
    if (!symbols.includes(alert.asset)) continue
    if (!hasLockedLevels(alert)) continue
    const key = `${alert.asset}|${alert.session}|${alert.date}`
    const expectedDate = dueSessions.includes(alert.session)
      ? alertDateForSession(alert.session, now)
      : null
    if (expectedDate && alert.date === expectedDate) {
      const existing = bySessionKey.get(key)
      // Prefer the earliest locked alert — never replace locked levels with a newer rewrite
      if (
        !existing ||
        new Date(alert.noticedAt).getTime() < new Date(existing.noticedAt).getTime()
      ) {
        bySessionKey.set(key, alert)
      }
    } else if (!expectedDate) {
      // Historical session bucket outside today's due list — keep as-is via byId
    }
  }

  const missingAssets = symbols.filter((asset) =>
    dueSessions.some((session) => {
      const d = alertDateForSession(session, now)
      return !bySessionKey.has(`${asset}|${session}|${d}`)
    }),
  )

  if (missingAssets.length > 0) {
    const market = await Promise.all(
      missingAssets.map(async (asset) => {
        const feed = await fetchMultiTimeframe(asset)
        return [asset, feed] as const
      }),
    )
    const byAsset = new Map(market)

    for (const asset of missingAssets) {
      const feed = byAsset.get(asset)
      if (!feed) continue
      // Never lock alerts from synthetic / demo OHLC — those prices were never traded
      if (!feed.live || feed.source === 'synthetic' || feed.source === 'tradingview-spot') {
        continue
      }

      for (const session of dueSessions) {
        const sessionDate = alertDateForSession(session, now)
        const key = `${asset}|${session}|${sessionDate}`
        // Hard lock: if this session already has levels, skip forever
        if (bySessionKey.has(key)) continue
        const existingById = byId.get(`${asset}-${sessionDate}-${session}`)
        if (existingById && hasLockedLevels(existingById)) {
          bySessionKey.set(key, existingById)
          continue
        }

        const liveArrival = shouldLockToLiveArrival(session, now, latestSession)
        const asOfMs = sessionScanAsOfMs(session, now)
        const sessionFeed = liveArrival
          ? feedAtLiveArrival(feed)
          : feedAsOfSession(asset, feed, asOfMs)
        if (!sessionFeed || sessionFeed.m15.candles.length < 8 || sessionFeed.spot == null) continue

        const analysis = analyzeMultiTimeframe(asset, session, sessionFeed)
        const openLabel = sessionOpenUtc(session, now).toISOString().slice(11, 16)
        const entryShown = analysis.entry
        analysis.aiNote = liveArrival
          ? `${analysis.aiNote} Locked to live market on arrival at ${entryShown} (${session}, open ~${openLabel} UTC) — levels fixed.`
          : `${analysis.aiNote} Locked to ${session} open market at ${entryShown} (~${openLabel} UTC) — levels fixed.`

        const signal = createSignal(asset, session, sessionDate, now, analysis, {
          // Arrival locks use "now"; backfills use the session open time
          noticedAt: liveArrival ? now : sessionOpenUtc(session, now),
        })
        bySessionKey.set(key, signal)
        byId.set(signal.id, signal)
      }
    }
  }

  // Only update trending flags — never rewrite locked levels
  for (const [key, alert] of bySessionKey) {
    const next = withTrendingOnly(
      alert,
      Boolean(latestSession && alert.session === latestSession && alert.date === latestDate),
    )
    bySessionKey.set(key, next)
    byId.set(next.id, next)
  }

  for (const [id, alert] of byId) {
    const isLatest =
      Boolean(latestSession) && alert.session === latestSession && alert.date === latestDate
    if (alert.trending && !isLatest) {
      byId.set(id, withTrendingOnly(alert, false))
    }
  }

  const merged = [...byId.values()].filter((a) => isRecentAlert(a, now, ALERT_HISTORY_TRADING_DAYS))
  const forScanner = merged.filter(
    (a) => symbols.includes(a.asset) && (a.date ? historyDates.has(a.date) : isRecentAlert(a, now)),
  )
  const next = organizeAlertsForScanner(forScanner, symbols, now)

  const organizedIds = new Set(next.map((a) => a.id))
  // Keep history for scanner symbols + recent alerts for other symbols
  const preserved = merged.filter((a) => !organizedIds.has(a.id))
  writeStored([...preserved, ...next])
  return next
}

export function organizeAlertsForScanner(alerts: Alert[], symbols: string[], now = new Date()): Alert[] {
  const out: Alert[] = []
  const latestSession = sessionsDueToday(now).at(-1)
  const latestDate = latestSession ? alertDateForSession(latestSession, now) : ''

  for (const asset of symbols) {
    const forSymbol = alerts
      .filter((a) => a.asset === asset)
      .sort((a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime())

    if (!forSymbol.length) continue

    const marked = forSymbol.map((a) =>
      withTrendingOnly(
        a,
        Boolean(latestSession && a.session === latestSession && a.date === latestDate),
      ),
    )

    if (latestSession && !marked.some((a) => a.trending)) {
      const fallback = marked.find((a) => a.session === latestSession) ?? marked[0]
      if (fallback) {
        const idx = marked.findIndex((a) => a.id === fallback.id)
        if (idx >= 0) marked[idx] = withTrendingOnly(marked[idx]!, true)
      }
    }

    marked.sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1
      return new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime()
    })
    out.push(...marked)
  }

  return out
}

/** Alerts for selected symbols on the current trading day (Dashboard). */
export function getTodaysAlerts(alerts: Alert[], symbols: string[], now = new Date()): Alert[] {
  const today = currentTradingDateKeys(now)
  const scoped = alerts.filter(
    (a) => symbols.includes(a.asset) && ((a.date && today.has(a.date)) || (!a.date && isRecentAlert(a, now, 1))),
  )
  return organizeAlertsForScanner(scoped, symbols, now)
}

/** Alerts for selected symbols across the last 5 trading days (My Alerts). */
export function getHistoryAlerts(alerts: Alert[], symbols: string[], now = new Date()): Alert[] {
  const window = recentTradingDateKeys(now, ALERT_HISTORY_TRADING_DAYS)
  const scoped = alerts.filter(
    (a) =>
      symbols.includes(a.asset) && (a.date ? window.has(a.date) : isRecentAlert(a, now, ALERT_HISTORY_TRADING_DAYS)),
  )
  return organizeAlertsForScanner(scoped, symbols, now)
}

/** @deprecated Prefer getTodaysAlerts — kept for callers expecting the latest session only. */
export function getCurrentTrades(alerts: Alert[], symbols: string[]): Alert[] {
  return getTodaysAlerts(alerts, symbols).filter((a) => a.trending)
}

export function getAlerts(): Alert[] {
  return readStored().sort(
    (a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime(),
  )
}

export function getAlertsForSymbols(symbols: string[]): Alert[] {
  void syncAlertsForSymbols(symbols)
  return getAlerts().filter((a) => symbols.includes(a.asset))
}

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
