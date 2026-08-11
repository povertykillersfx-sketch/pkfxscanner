import {
  MARKET_SESSIONS,
  MAX_SIGNALS_PER_DAY,
  type Alert,
  type MarketSession,
  type Sentiment,
} from './data/mockData'

const ALERTS_KEY = 'pkfx_ai_alerts'

/** Approximate mid-market reference prices for AI level generation */
const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.085,
  GBPUSD: 1.268,
  USDJPY: 148.6,
  NZDUSD: 0.602,
  USDZAR: 18.35,
  GOLD: 3345,
  US30: 40050,
  NASDAQ: 17980,
  AUDUSD: 0.656,
}

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function formatPrice(asset: string, value: number): string {
  if (asset === 'USDJPY') return value.toFixed(2)
  if (asset === 'GOLD') return value.toFixed(2)
  if (asset === 'US30' || asset === 'NASDAQ') return value.toFixed(0)
  if (asset === 'USDZAR') return value.toFixed(2)
  return value.toFixed(4)
}

function buildLevels(asset: string, sentiment: Sentiment, seed: string) {
  const rand = mulberry32(hashSeed(seed))
  const base = BASE_PRICES[asset] ?? 1
  const step =
    asset === 'GOLD' || asset === 'US30' || asset === 'NASDAQ'
      ? base * 0.0025
      : asset === 'USDJPY'
        ? 0.18
        : asset === 'USDZAR'
          ? 0.08
          : 0.0022

  const entry = base + (rand() - 0.5) * step * 0.6
  const dir = sentiment === 'Bearish' ? -1 : 1

  const targets = [
    formatPrice(asset, entry + dir * step * (1.1 + rand() * 0.5)),
    formatPrice(asset, entry + dir * step * (1.9 + rand() * 0.6)),
  ]
  const reversals = [
    formatPrice(asset, entry - dir * step * (0.9 + rand() * 0.4)),
    formatPrice(asset, entry - dir * step * (1.7 + rand() * 0.5)),
  ]

  return { entry: formatPrice(asset, entry), targets, reversals }
}

function aiNote(asset: string, session: MarketSession, sentiment: Sentiment): string {
  const bias = sentiment === 'Bullish' ? 'buy-side momentum' : 'sell-side pressure'
  return `AI noticed ${bias} on ${asset} during the ${session} session. Targets below are for this current signal.`
}

/**
 * Sessions that have already produced (or are due to produce) a signal today.
 * Up to 4/day: Sydney, Asian, London, New York.
 */
export function sessionsDueToday(now = new Date()): MarketSession[] {
  const hour = now.getUTCHours()
  const due: MarketSession[] = []

  for (const session of MARKET_SESSIONS) {
    // Sydney fires late prior evening — count it for "today" if we're past midnight
    // or if current hour has reached its signal hour.
    if (session.id === 'Sydney') {
      // Sydney signal at 22:00 UTC previous calendar stretch; available all day after it fires
      if (hour >= session.signalHourUtc || hour < 6) due.push(session.id)
      continue
    }
    if (hour >= session.signalHourUtc) due.push(session.id)
  }

  // Cap at 4
  return due.slice(0, MAX_SIGNALS_PER_DAY)
}

function createSignal(
  asset: string,
  session: MarketSession,
  date: string,
  now: Date,
): Alert {
  const seed = `${asset}|${date}|${session}`
  const rand = mulberry32(hashSeed(seed))
  const sentiment: Sentiment = rand() > 0.5 ? 'Bullish' : 'Bearish'
  const levels = buildLevels(asset, sentiment, seed)
  const sessionMeta = MARKET_SESSIONS.find((s) => s.id === session)!

  const noticed = new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    sessionMeta.signalHourUtc,
    Math.floor(rand() * 50),
    Math.floor(rand() * 50),
  ))
  // Don't show future notice times
  if (noticed.getTime() > now.getTime()) {
    noticed.setTime(now.getTime() - Math.floor(rand() * 20 * 60 * 1000))
  }

  return {
    id: `${asset}-${date}-${session}`,
    asset,
    sentiment,
    strategy: 'Momentum',
    date,
    noticedAt: noticed.toISOString(),
    session,
    trending: session === sessionsDueToday(now).at(-1),
    targets: levels.targets,
    reversals: levels.reversals,
    entry: levels.entry,
    aiNote: aiNote(asset, session, sentiment),
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
 * Sync AI alerts for scanner symbols.
 * - Up to 4 signals/day per symbol (one per session: Sydney / Asian / London / New York)
 * - Alerts stay until a newer signal for that symbol+session replaces them
 * - Viewing an alert never removes it
 */
export function syncAlertsForSymbols(symbols: string[], now = new Date()): Alert[] {
  const date = utcDateKey(now)
  const dueSessions = sessionsDueToday(now)
  const stored = readStored()

  // Keep existing alerts for current scanner symbols until replaced by a newer signal.
  // Viewing never deletes; only a new signal for the same symbol+session replaces it.
  const bySessionKey = new Map<string, Alert>()

  for (const alert of stored) {
    if (!symbols.includes(alert.asset)) continue
    const key = `${alert.asset}|${alert.session}`
    const existing = bySessionKey.get(key)
    if (!existing || new Date(alert.noticedAt) >= new Date(existing.noticedAt)) {
      bySessionKey.set(key, alert)
    }
  }

  for (const asset of symbols) {
    for (const session of dueSessions) {
      const key = `${asset}|${session}`
      const existing = bySessionKey.get(key)
      // Create today's signal only if we don't already have today's for this session
      if (!existing || existing.date !== date) {
        bySessionKey.set(key, createSignal(asset, session, date, now))
      }
    }
  }

  const next = [...bySessionKey.values()].sort(
    (a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime(),
  )

  writeStored(next)
  return next
}

export function getAlerts(): Alert[] {
  return readStored().sort(
    (a, b) => new Date(b.noticedAt).getTime() - new Date(a.noticedAt).getTime(),
  )
}

export function getAlertsForSymbols(symbols: string[]): Alert[] {
  return syncAlertsForSymbols(symbols)
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
