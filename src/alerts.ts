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

/** Locked session signals — one alert per symbol/session/day (does not keep rewriting levels) */
const ALERTS_KEY = 'pkfx_live_alerts_v9_traded_prices'
/** Keep past alerts on My Alerts for this many UTC days (including today). */
const ALERT_HISTORY_DAYS = 5
/** Minutes into a session used for the opening scan snapshot. */
const SESSION_SCAN_GRACE_MIN = 10

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Inclusive window of recent UTC date keys: today and the previous (days - 1) days. */
function recentDateKeys(now = new Date(), days = ALERT_HISTORY_DAYS): Set<string> {
  const keys = new Set<string>()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    keys.add(utcDateKey(d))
  }
  return keys
}

function isRecentAlert(alert: Alert, now = new Date(), days = ALERT_HISTORY_DAYS): boolean {
  if (alert.date && recentDateKeys(now, days).has(alert.date)) return true
  // Fallback for older records without a reliable date field
  const t = new Date(alert.noticedAt).getTime()
  if (!Number.isFinite(t)) return false
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1))
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
 * Realistic price-step plan so SL/TP stay near market at release.
 * Caps wild ATR/pivots from coarse or multi-hour ranges.
 */
function levelBudget(asset: string, entry: number, atr15: number): {
  /** Typical 15m noise / min stop padding */
  tick: number
  /** Max stop distance from entry */
  maxStop: number
  /** Max TP1 distance from entry */
  maxTp1: number
  /** Max TP2 distance from entry */
  maxTp2: number
  /** Working ATR clipped to instrument norms */
  step: number
} {
  const px = Math.abs(entry) || 1
  // Soft ATR clip (~0.08% of price) so daily/coarse bars cannot explode distances
  const atrCap = px * 0.0008
  let step = Math.min(Math.max(atr15, px * 0.00012), atrCap)

  // Instrument overrides (absolute price units)
  switch (asset) {
    case 'USDJPY':
      step = Math.min(Math.max(step, 0.04), 0.18)
      return { tick: 0.01, maxStop: 0.25, maxTp1: 0.4, maxTp2: 0.75, step }
    case 'USDZAR':
      step = Math.min(Math.max(step, 0.04), 0.2)
      return { tick: 0.01, maxStop: 0.35, maxTp1: 0.55, maxTp2: 1.0, step }
    case 'GOLD':
      step = Math.min(Math.max(step, 1.2), 4)
      return { tick: 0.1, maxStop: 8, maxTp1: 14, maxTp2: 28, step }
    case 'US30':
      step = Math.min(Math.max(step, 40), 120)
      return { tick: 1, maxStop: 180, maxTp1: 280, maxTp2: 520, step }
    case 'NASDAQ':
      step = Math.min(Math.max(step, 30), 100)
      return { tick: 1, maxStop: 150, maxTp1: 240, maxTp2: 450, step }
    default:
      // Majors / crosses quoted to 4–5 decimals
      step = Math.min(Math.max(step, 0.00035), 0.0012)
      return { tick: 0.0001, maxStop: 0.0025, maxTp1: 0.004, maxTp2: 0.0075, step }
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
 * Entry at alert release = last traded 15m close (a price the market printed).
 * Optional spot is only used when it sits inside the recent OHLC range.
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
  const rawAtr = Math.max(atr(window, 14), Math.abs(last.close) * 0.00015)
  const recent = window.slice(-8)
  const microSwingHigh = Math.max(...recent.map((c) => c.high))
  const microSwingLow = Math.min(...recent.map((c) => c.low))

  // Traded range over ~24h of 15m bars (or available history)
  const dayBars = m15.slice(-96)
  const dayHigh = Math.max(...dayBars.map((c) => c.high))
  const dayLow = Math.min(...dayBars.map((c) => c.low))

  let market = last.close
  if (marketPrice != null && Number.isFinite(marketPrice)) {
    const pad = Math.max((dayHigh - dayLow) * 0.01, Math.abs(last.close) * 0.0003)
    if (marketPrice >= dayLow - pad && marketPrice <= dayHigh + pad) {
      market = marketPrice
    }
  }

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
 * SL + targets anchored to entry with hard instrument caps.
 * Nearby micro-structure may nudge levels only inside those caps.
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
  const { step, maxStop, maxTp1, maxTp2 } = levelBudget(asset, entry, atr15)

  // Prefer a stop just beyond the last few 15m bars, but never beyond maxStop
  const structureRisk =
    sentiment === 'Bullish'
      ? Math.max(entry - m15SwingLow, step * 0.6)
      : Math.max(m15SwingHigh - entry, step * 0.6)

  const risk = clampDist(structureRisk, step * 0.55, maxStop)
  const rev1 = entry - dir * risk
  const rev2 = entry - dir * clampDist(risk * 1.35, risk * 1.1, maxStop * 1.15)

  // Targets from R multiples, hard-capped near market
  let tp1 = entry + dir * clampDist(risk * 1.5, step * 0.9, maxTp1)
  let tp2 = entry + dir * clampDist(risk * 2.6, Math.abs(tp1 - entry) * 1.35, maxTp2)

  // Keep ordering + side
  if (dir * (tp1 - entry) <= 0) tp1 = entry + dir * Math.min(maxTp1, step * 1.2)
  if (dir * (tp2 - tp1) <= 0) tp2 = tp1 + dir * Math.min(Math.max(maxTp2 - Math.abs(tp1 - entry), step), step * 1.4)

  return {
    targets: [formatPrice(asset, tp1), formatPrice(asset, tp2)],
    reversals: [formatPrice(asset, rev1), formatPrice(asset, rev2)],
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
 * - Entry: exact market at release
 * - SL/TP: instrument-capped distances from that entry (not distant pivots)
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

  const entryHint = awaitingPullback
    ? `market entry ${formatPrice(asset, entry)} (extended — wait pullback for better fill)`
    : `entry ${formatPrice(asset, entry)}`
  const aiNote = `PKFX MTF on ${asset} (${session}): 4H ${h4.sentiment.toLowerCase()} (score ${h4.score > 0 ? '+' : ''}${h4.score}, ${h4.changePct >= 0 ? '+' : ''}${h4.changePct.toFixed(2)}%, RSI ${h4.rsi.toFixed(0)}) → 1H ${h1.sentiment.toLowerCase()} (score ${h1.score > 0 ? '+' : ''}${h1.score}) → ${entryHint} · market ${formatPrice(asset, market)}. ${bias} · conviction ${conviction}; SL/TP capped near market (session-scale). Feed: ${src}.`

  return {
    sentiment,
    strategy,
    entry: formatPrice(asset, entry),
    targets,
    reversals,
    aiNote,
    live: feed.live,
    changePct: m15Read.changePct,
    spot: formatPrice(asset, market),
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
  const cut = candles.filter((c) => Number.isFinite(c.timestamp) && c.timestamp <= asOfMs)
  if (cut.length >= 24) return cut
  if (cut.length >= 12) return cut

  // Synthetic / broken timestamps: drop newest bars proportional to how far asOf is
  const firstTs = candles[0]!.timestamp
  const lastTs = candles[candles.length - 1]!.timestamp
  if (!Number.isFinite(firstTs) || !Number.isFinite(lastTs) || lastTs <= firstTs) {
    return candles
  }
  if (asOfMs >= lastTs) return candles
  const ratio = Math.min(1, Math.max(0.3, (asOfMs - firstTs) / (lastTs - firstTs)))
  const keep = Math.max(24, Math.floor(candles.length * ratio))
  return candles.slice(0, Math.min(candles.length, keep))
}

/**
 * Snapshot the MTF feed as it looked at a session's scan time.
 * Spot/entry always come from the last 15m close at asOf — never a later live quote
 * (that invents prices the market had not printed at session open).
 */
function feedAsOfSession(feed: MultiTimeframeFeed, asOfMs: number, _nowMs: number): MultiTimeframeFeed {
  const m15Candles = truncateCandles(feed.m15.candles, asOfMs)
  const h1Candles = truncateCandles(feed.h1.candles, asOfMs)
  const h4Candles = truncateCandles(feed.h4.candles, asOfMs)
  const lastClose =
    m15Candles[m15Candles.length - 1]?.close ??
    h1Candles[h1Candles.length - 1]?.close ??
    feed.spot

  return {
    m15: { ...feed.m15, candles: m15Candles, spot: lastClose },
    h1: { ...feed.h1, candles: h1Candles, spot: lastClose },
    h4: { ...feed.h4, candles: h4Candles, spot: lastClose },
    live: feed.live,
    source: feed.source,
    spot: lastClose,
  }
}

function createSignal(
  asset: string,
  session: MarketSession,
  date: string,
  now: Date,
  analysis: MarketSignal,
): Alert {
  const openAt = sessionOpenUtc(session, now)
  const noticed = new Date(openAt)
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
 * Each due session is scanned independently at that session's open time
 * (candles truncated as-of the open), so Sydney / Asian / London / NY differ.
 * One locked alert per symbol + session + session-date (no mid-session rewrite).
 * Weekends: no new alerts are created (Sat + Sun before Sydney open).
 */
export async function syncAlertsForSymbols(symbols: string[], now = new Date()): Promise<Alert[]> {
  const dueSessions = sessionsDueToday(now)
  const latestSession = dueSessions.at(-1)
  const latestDate = latestSession ? alertDateForSession(latestSession, now) : ''
  const historyDates = recentDateKeys(now, ALERT_HISTORY_DAYS)
  // Also keep Sydney's previous-UTC-day bucket when it is the overnight session
  for (const session of dueSessions) {
    historyDates.add(alertDateForSession(session, now))
  }
  const stored = readStored().filter((a) => isRecentAlert(a, now, ALERT_HISTORY_DAYS))

  // Weekend: keep history, do not scan or lock new signals
  if (!isAlertWeekday(now)) {
    const kept = stored.map((a) => ({ ...a, trending: false }))
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
    const key = `${alert.asset}|${alert.session}|${alert.date}`
    const expectedDate = dueSessions.includes(alert.session)
      ? alertDateForSession(alert.session, now)
      : null
    if (expectedDate && alert.date === expectedDate) {
      const existing = bySessionKey.get(key)
      if (!existing || new Date(alert.noticedAt) >= new Date(existing.noticedAt)) {
        bySessionKey.set(key, alert)
      }
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
    const nowMs = now.getTime()

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
        if (bySessionKey.has(key)) continue

        // Independent market scan as-of this session's open (not "now" for every session)
        const asOfMs = sessionScanAsOfMs(session, now)
        const sessionFeed = feedAsOfSession(feed, asOfMs, nowMs)
        if (sessionFeed.m15.candles.length < 20 || sessionFeed.spot == null) continue

        const analysis = analyzeMultiTimeframe(asset, session, sessionFeed)
        const openLabel = sessionOpenUtc(session, now).toISOString().slice(11, 16)
        analysis.aiNote = `${analysis.aiNote} Scanned at ${session} open (~${openLabel} UTC).`

        const signal = createSignal(asset, session, sessionDate, now, analysis)
        bySessionKey.set(key, signal)
        byId.set(signal.id, signal)
      }
    }
  }

  // Only update trending flags — never rewrite locked levels
  for (const [key, alert] of bySessionKey) {
    const next = {
      ...alert,
      trending: Boolean(
        latestSession && alert.session === latestSession && alert.date === latestDate,
      ),
    }
    bySessionKey.set(key, next)
    byId.set(next.id, next)
  }

  for (const [id, alert] of byId) {
    const isLatest =
      Boolean(latestSession) && alert.session === latestSession && alert.date === latestDate
    if (alert.trending && !isLatest) {
      byId.set(id, { ...alert, trending: false })
    }
  }

  const merged = [...byId.values()].filter((a) => isRecentAlert(a, now, ALERT_HISTORY_DAYS))
  const forScanner = merged.filter(
    (a) => symbols.includes(a.asset) && (a.date ? historyDates.has(a.date) : isRecentAlert(a, now)),
  )
  const next = organizeAlertsForScanner(forScanner, symbols, now)

  const organizedIds = new Set(next.map((a) => a.id))
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

    const marked = forSymbol.map((a) => ({
      ...a,
      trending: Boolean(latestSession && a.session === latestSession && a.date === latestDate),
    }))

    if (latestSession && !marked.some((a) => a.trending)) {
      const fallback = marked.find((a) => a.session === latestSession) ?? marked[0]
      if (fallback) {
        const idx = marked.findIndex((a) => a.id === fallback.id)
        if (idx >= 0) marked[idx] = { ...marked[idx]!, trending: true }
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

export function getCurrentTrades(alerts: Alert[], symbols: string[]): Alert[] {
  return organizeAlertsForScanner(alerts, symbols).filter((a) => a.trending)
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
