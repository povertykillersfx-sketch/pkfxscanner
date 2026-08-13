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
const ALERTS_KEY = 'pkfx_live_alerts_v4_sticky'
/** Keep past alerts on My Alerts for this many UTC days (including today). */
const ALERT_HISTORY_DAYS = 5

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
  atr: number
  lastClose: number
  emaBull: boolean
}

/** Bias / structure read on one timeframe */
function readTimeframe(candles: Candle[], lookbackBars: number): TfRead {
  const window = candles.slice(-Math.max(lookbackBars + 5, 24))
  const closes = window.map((c) => c.close)
  const last = window[window.length - 1]!
  const first = window[Math.max(0, window.length - lookbackBars)]!
  const changePct = ((last.close - first.open) / first.open) * 100
  const range = atr(window, 14)
  const fast = ema(closes, 9)
  const slow = ema(closes, 21)
  const fastNow = fast[fast.length - 1]!
  const slowNow = slow[slow.length - 1]!
  const emaBull = fastNow > slowNow
  const swingHigh = Math.max(...window.slice(-lookbackBars).map((c) => c.high))
  const swingLow = Math.min(...window.slice(-lookbackBars).map((c) => c.low))

  let score = 0
  if (emaBull) score += 1
  else score -= 1
  if (changePct > 0.05) score += 1
  else if (changePct < -0.05) score -= 1
  if (last.close > (swingHigh + swingLow) / 2) score += 1
  else score -= 1

  const sentiment: Sentiment = score >= 0 ? 'Bullish' : 'Bearish'
  return {
    sentiment,
    score,
    changePct,
    swingHigh,
    swingLow,
    atr: range,
    lastClose: last.close,
    emaBull,
  }
}

/**
 * 15m entry in the direction of HTF bias:
 * - Bullish: pullback low / reclaim of 15m EMA — use actionable 15m price
 * - Bearish: pullback high / reject of 15m EMA
 */
function entryFrom15m(m15: Candle[], sentiment: Sentiment): { entry: number; microSwingHigh: number; microSwingLow: number } {
  const window = m15.slice(-32)
  const closes = window.map((c) => c.close)
  const last = window[window.length - 1]!
  const slow = ema(closes, 21)
  const ema21 = slow[slow.length - 1]!
  const recent = window.slice(-8)
  const microSwingHigh = Math.max(...recent.map((c) => c.high))
  const microSwingLow = Math.min(...recent.map((c) => c.low))

  if (sentiment === 'Bullish') {
    const pullback = Math.min(Math.max(microSwingLow, ema21 * 0.9995), last.close)
    const entry = last.close >= ema21 ? last.close : pullback
    return { entry, microSwingHigh, microSwingLow }
  }

  const pullback = Math.max(Math.min(microSwingHigh, ema21 * 1.0005), last.close)
  const entry = last.close <= ema21 ? last.close : pullback
  return { entry, microSwingHigh, microSwingLow }
}

/** Targets from higher-timeframe structure; stops/reversals from 15m */
function levelsFromHtf(
  asset: string,
  sentiment: Sentiment,
  entry: number,
  h4: TfRead,
  h1: TfRead,
  m15SwingHigh: number,
  m15SwingLow: number,
): { targets: string[]; reversals: string[] } {
  const dir = sentiment === 'Bullish' ? 1 : -1
  const h1Step = Math.max(h1.atr, Math.abs(entry) * 0.0006)
  const h4Step = Math.max(h4.atr, Math.abs(entry) * 0.001)

  const swingTp1 =
    sentiment === 'Bullish'
      ? h1.swingHigh > entry
        ? h1.swingHigh
        : entry + dir * h1Step * 1.15
      : h1.swingLow < entry
        ? h1.swingLow
        : entry + dir * h1Step * 1.15

  const swingTp2 =
    sentiment === 'Bullish'
      ? h4.swingHigh > swingTp1
        ? h4.swingHigh
        : swingTp1 + dir * h4Step * 0.85
      : h4.swingLow < swingTp1
        ? h4.swingLow
        : swingTp1 + dir * h4Step * 0.85

  const targets = [formatPrice(asset, swingTp1), formatPrice(asset, swingTp2)]

  const rev1 =
    sentiment === 'Bullish'
      ? Math.min(m15SwingLow, entry - h1Step * 0.55)
      : Math.max(m15SwingHigh, entry + h1Step * 0.55)
  const rev2 =
    sentiment === 'Bullish'
      ? Math.min(h1.swingLow, rev1 - h1Step * 0.7)
      : Math.max(h1.swingHigh, rev1 + h1Step * 0.7)

  const reversals = [formatPrice(asset, rev1), formatPrice(asset, rev2)]
  return { targets, reversals }
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
 * - Bias from 4H → 1H (big picture down to execution bias)
 * - Entry from 15m
 * - Targets from HTF swings/ATR; reversals from 15m + 1H invalidation
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
  const sentiment: Sentiment = aligned
    ? h4.sentiment
    : Math.abs(h4.score) >= Math.abs(h1.score)
      ? h4.sentiment
      : h1.sentiment

  let strategy = 'MTF Momentum'
  if (aligned && h4.sentiment === 'Bullish' && h1.emaBull) strategy = '4H→1H Bull / 15m Entry'
  else if (aligned && h4.sentiment === 'Bearish' && !h1.emaBull) strategy = '4H→1H Bear / 15m Entry'
  else if (!aligned) strategy = 'MTF Mixed · 15m Entry'
  else strategy = 'HTF Bias · 15m Entry'

  const m15Agrees =
    (sentiment === 'Bullish' && m15Read.score >= -1) || (sentiment === 'Bearish' && m15Read.score <= 1)
  if (!m15Agrees) {
    strategy = `${strategy} (wait 15m)`
  }

  const { entry: rawEntry, microSwingHigh, microSwingLow } = entryFrom15m(feed.m15.candles, sentiment)
  // Prefer verified live spot for the 15m entry so it matches TradingView / market
  const entry = feed.spot != null && Number.isFinite(feed.spot) ? feed.spot : rawEntry
  const { targets, reversals } = levelsFromHtf(
    asset,
    sentiment,
    entry,
    h4,
    h1,
    microSwingHigh,
    microSwingLow,
  )

  const bias = sentiment === 'Bullish' ? 'buy-side' : 'sell-side'
  const src = feed.live
    ? `live OHLC (${feed.source})`
    : feed.source === 'tradingview-spot'
      ? 'TradingView spot (OHLC fallback)'
      : 'DEMO / synthetic — not live market'
  const aiNote = `PKFX MTF on ${asset} (${session}): 4H ${h4.sentiment.toLowerCase()} (${h4.changePct >= 0 ? '+' : ''}${h4.changePct.toFixed(2)}%) → 1H ${h1.sentiment.toLowerCase()} → 15m entry ${formatPrice(asset, entry)}${feed.spot != null ? ` · market ${formatPrice(asset, feed.spot)}` : ''}. ${bias} bias from HTF; targets from 1H/4H structure. Feed: ${src}.`

  return {
    sentiment,
    strategy,
    entry: formatPrice(asset, entry),
    targets,
    reversals,
    aiNote,
    live: feed.live,
    changePct: m15Read.changePct,
    spot: feed.spot != null ? formatPrice(asset, feed.spot) : undefined,
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
      0,
      0,
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
 * Bias: 4H → 1H · Entry: 15m · Targets: HTF structure
 * One locked alert per symbol + session + UTC day (no mid-session rewrite).
 * Keeps the last 5 days of alerts for My Alerts history.
 */
export async function syncAlertsForSymbols(symbols: string[], now = new Date()): Promise<Alert[]> {
  const date = utcDateKey(now)
  const dueSessions = sessionsDueToday(now)
  const latestSession = dueSessions.at(-1)
  const historyDates = recentDateKeys(now, ALERT_HISTORY_DAYS)
  const stored = readStored().filter((a) => isRecentAlert(a, now, ALERT_HISTORY_DAYS))

  // Keep recent stored alerts (other symbols / prior days) so refresh does not wipe history
  const byId = new Map<string, Alert>()
  for (const alert of stored) {
    byId.set(alert.id, alert)
  }

  const bySessionKey = new Map<string, Alert>()
  for (const alert of stored) {
    if (!symbols.includes(alert.asset)) continue
    if (alert.date !== date) continue
    const key = `${alert.asset}|${alert.session}|${alert.date}`
    const existing = bySessionKey.get(key)
    if (!existing || new Date(alert.noticedAt) >= new Date(existing.noticedAt)) {
      bySessionKey.set(key, alert)
    }
  }

  const missingAssets = symbols.filter((asset) =>
    dueSessions.some((session) => !bySessionKey.has(`${asset}|${session}|${date}`)),
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
      const analysisCache = new Map<MarketSession, MarketSignal>()

      for (const session of dueSessions) {
        const key = `${asset}|${session}|${date}`
        if (bySessionKey.has(key)) continue

        let analysis = analysisCache.get(session)
        if (!analysis) {
          analysis = analyzeMultiTimeframe(asset, session, feed)
          analysisCache.set(session, analysis)
        }

        const signal = createSignal(asset, session, date, now, analysis)
        bySessionKey.set(key, signal)
        byId.set(signal.id, signal)
      }
    }
  }

  // Only update trending flags on today's scanner alerts — never rewrite levels
  for (const [key, alert] of bySessionKey) {
    const next = {
      ...alert,
      trending: alert.date === date && alert.session === latestSession,
    }
    bySessionKey.set(key, next)
    byId.set(next.id, next)
  }

  // Clear stale "current" flags on older days so only today's latest session is trending
  for (const [id, alert] of byId) {
    if (alert.date === date) continue
    if (!alert.trending) continue
    byId.set(id, { ...alert, trending: false })
  }

  const merged = [...byId.values()].filter((a) => isRecentAlert(a, now, ALERT_HISTORY_DAYS))
  const forScanner = merged.filter(
    (a) => symbols.includes(a.asset) && (a.date ? historyDates.has(a.date) : isRecentAlert(a, now)),
  )
  const next = organizeAlertsForScanner(forScanner, symbols, now)

  // Persist recent history for scanner symbols + any other recent stored alerts
  const organizedIds = new Set(next.map((a) => a.id))
  const preserved = merged.filter((a) => !organizedIds.has(a.id))
  writeStored([...preserved, ...next])
  return next
}

export function organizeAlertsForScanner(alerts: Alert[], symbols: string[], now = new Date()): Alert[] {
  const out: Alert[] = []
  const today = utcDateKey(now)
  const latestSession = sessionsDueToday(now).at(-1)

  for (const asset of symbols) {
    const forSymbol = alerts
      .filter((a) => a.asset === asset)
      .sort((a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime())

    if (!forSymbol.length) continue

    const marked = forSymbol.map((a) => ({
      ...a,
      trending: Boolean(latestSession && a.date === today && a.session === latestSession),
    }))

    // If latest session alert is missing today, keep the most recent today alert marked current
    if (latestSession && !marked.some((a) => a.trending)) {
      const todayFirst = marked.find((a) => a.date === today)
      if (todayFirst) {
        const idx = marked.findIndex((a) => a.id === todayFirst.id)
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
