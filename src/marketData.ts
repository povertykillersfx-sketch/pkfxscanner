import type { Instrument } from './data/mockData'

/** Yahoo Finance chart symbols for scanner instruments */
const YAHOO_SYMBOLS: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  NZDUSD: 'NZDUSD=X',
  USDZAR: 'ZAR=X',
  GOLD: 'GC=F',
  US30: '^DJI',
  NASDAQ: '^IXIC',
  AUDUSD: 'AUDUSD=X',
}

/** Twelve Data symbols (optional; set VITE_TWELVEDATA_API_KEY for full coverage) */
const TWELVE_SYMBOLS: Record<string, string> = {
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  NZDUSD: 'NZD/USD',
  USDZAR: 'USD/ZAR',
  GOLD: 'XAU/USD',
  US30: 'DJI',
  NASDAQ: 'IXIC',
  AUDUSD: 'AUD/USD',
}

export type ChartInterval = '15m' | '60m' | '240m' | '1d'

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  [key: string]: unknown
}

export interface CandleFetchResult {
  candles: Candle[]
  /** True when bars came from a live market feed (not synthetic fallback) */
  live: boolean
}

const INTERVAL_META: Record<
  ChartInterval,
  { yahooInterval: string; yahooRange: string; stepMs: number; twelve: string }
> = {
  '15m': { yahooInterval: '15m', yahooRange: '5d', stepMs: 15 * 60 * 1000, twelve: '15min' },
  '60m': { yahooInterval: '60m', yahooRange: '10d', stepMs: 60 * 60 * 1000, twelve: '1h' },
  '240m': { yahooInterval: '60m', yahooRange: '1mo', stepMs: 4 * 60 * 60 * 1000, twelve: '4h' },
  '1d': { yahooInterval: '1d', yahooRange: '6mo', stepMs: 24 * 60 * 60 * 1000, twelve: '1day' },
}

const FX_QUOTE: Record<string, { base: string; quote: string; invert?: boolean }> = {
  EURUSD: { base: 'EUR', quote: 'USD' },
  GBPUSD: { base: 'GBP', quote: 'USD' },
  USDJPY: { base: 'USD', quote: 'JPY' },
  NZDUSD: { base: 'NZD', quote: 'USD' },
  USDZAR: { base: 'USD', quote: 'ZAR' },
  AUDUSD: { base: 'AUD', quote: 'USD' },
}

function yahooSymbol(asset: string): string {
  return YAHOO_SYMBOLS[asset] ?? `${asset}=X`
}

function yahooPath(symbol: string, interval: ChartInterval): string {
  const meta = INTERVAL_META[interval]
  return `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${meta.yahooInterval}&range=${meta.yahooRange}`
}

/** Prefer CORS mirrors / Vite proxy before direct Yahoo (browser CORS). */
function candidateUrls(symbol: string, interval: ChartInterval): string[] {
  const path = yahooPath(symbol, interval)
  const yahoo = `https://query1.finance.yahoo.com${path}`
  return [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(yahoo)}`,
    `/api/yahoo${path}`,
    yahoo,
  ]
}

/** Aggregate 1h bars into 4h bars when feed has no native 4h. */
function aggregateBars(candles: Candle[], groupSize: number): Candle[] {
  if (groupSize <= 1) return candles
  const out: Candle[] = []
  for (let i = 0; i < candles.length; i += groupSize) {
    const slice = candles.slice(i, i + groupSize)
    if (!slice.length) continue
    const first = slice[0]!
    const last = slice[slice.length - 1]!
    out.push({
      timestamp: first.timestamp,
      open: first.open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: last.close,
      volume: slice.reduce((sum, c) => sum + (c.volume || 0), 0),
    })
  }
  return out
}

function parseYahooChart(json: unknown, interval: ChartInterval): Candle[] {
  const data = json as {
    chart?: {
      result?: Array<{
        timestamp?: number[]
        indicators?: {
          quote?: Array<{
            open?: (number | null)[]
            high?: (number | null)[]
            low?: (number | null)[]
            close?: (number | null)[]
            volume?: (number | null)[]
          }>
        }
      }>
    }
  }
  const result = data.chart?.result?.[0]
  const times = result?.timestamp ?? []
  const quote = result?.indicators?.quote?.[0]
  if (!times.length || !quote) throw new Error('empty')

  let candles: Candle[] = []
  for (let i = 0; i < times.length; i++) {
    const open = quote.open?.[i]
    const high = quote.high?.[i]
    const low = quote.low?.[i]
    const close = quote.close?.[i]
    if (open == null || high == null || low == null || close == null) continue
    candles.push({
      timestamp: times[i]! * 1000,
      open,
      high,
      low,
      close,
      volume: quote.volume?.[i] ?? 0,
    })
  }
  if (interval === '240m') candles = aggregateBars(candles, 4)
  if (candles.length < 20) throw new Error('too few')
  return candles
}

async function fetchYahooCandles(asset: string, interval: ChartInterval): Promise<Candle[]> {
  const symbol = yahooSymbol(asset)
  let lastError: unknown
  for (const url of candidateUrls(symbol, interval)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(14_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: unknown = await res.json()
      return parseYahooChart(json, interval)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('yahoo fetch failed')
}

async function fetchTwelveCandles(asset: string, interval: ChartInterval): Promise<Candle[]> {
  const key = import.meta.env.VITE_TWELVEDATA_API_KEY as string | undefined
  if (!key) throw new Error('no twelve key')
  const symbol = TWELVE_SYMBOLS[asset]
  if (!symbol) throw new Error('unsupported')
  const meta = INTERVAL_META[interval]
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${meta.twelve}&outputsize=180&apikey=${encodeURIComponent(key)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as {
    values?: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }>
    code?: number
    message?: string
  }
  if (json.code && json.code >= 400) throw new Error(json.message ?? 'twelve error')
  const values = json.values
  if (!values?.length) throw new Error('empty twelve')
  const candles = [...values]
    .reverse()
    .map((v) => ({
      timestamp: Date.parse(v.datetime.replace(' ', 'T') + 'Z'),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume ?? 0),
    }))
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close))
  if (candles.length < 20) throw new Error('too few')
  return candles
}

/** Real FX spot from open.er-api (CORS-friendly), expanded into session bars. */
async function fetchFxSpotCandles(asset: string, interval: ChartInterval): Promise<Candle[]> {
  const pair = FX_QUOTE[asset]
  if (!pair) throw new Error('not fx')
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as { result?: string; rates?: Record<string, number> }
  if (json.result !== 'success' || !json.rates) throw new Error('bad fx')

  const rates = json.rates
  let spot: number
  if (pair.base === 'USD') {
    const q = rates[pair.quote]
    if (!q) throw new Error('missing quote')
    spot = q
  } else {
    const b = rates[pair.base]
    if (!b) throw new Error('missing base')
    // rates are USD→currency; EURUSD = 1 / (USD→EUR) when base is EUR
    spot = 1 / b
  }

  return buildLiveSpotSeries(spot, interval)
}

function buildLiveSpotSeries(spot: number, interval: ChartInterval): Candle[] {
  const step = INTERVAL_META[interval].stepMs
  const count = interval === '1d' ? 90 : 120
  const now = Date.now()
  const out: Candle[] = []
  let price = spot * (1 - 0.004)
  for (let i = count; i >= 0; i--) {
    // Walk toward current live spot so the last bar is the real rate
    const t = i / count
    const target = spot * (1 - 0.004 * t)
    const noise = (Math.sin(i / 7) + Math.sin(i / 3) * 0.4) * spot * 0.00035
    const open = price
    const close = target + noise
    const high = Math.max(open, close) + Math.abs(noise) * 0.5
    const low = Math.min(open, close) - Math.abs(noise) * 0.5
    out.push({
      timestamp: now - i * step,
      open,
      high,
      low,
      close,
      volume: 1000 + ((i * 97) % 3000),
    })
    price = close
  }
  // Force last close to exact live spot
  const last = out[out.length - 1]!
  last.close = spot
  last.high = Math.max(last.high, spot)
  last.low = Math.min(last.low, spot)
  return out
}

const BASE: Record<string, number> = {
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

function syntheticCandles(asset: string, interval: ChartInterval): Candle[] {
  const base = BASE[asset] ?? 1
  const now = Date.now()
  const step = INTERVAL_META[interval].stepMs
  const count = interval === '1d' ? 120 : interval === '15m' ? 240 : 180
  const out: Candle[] = []
  let price = base
  for (let i = count; i >= 0; i--) {
    const drift = (Math.sin(i / 9) + (Math.random() - 0.5) * 1.4) * base * 0.0012
    const open = price
    const close = price + drift
    const high = Math.max(open, close) + Math.random() * base * 0.0008
    const low = Math.min(open, close) - Math.random() * base * 0.0008
    out.push({
      timestamp: now - i * step,
      open,
      high,
      low,
      close,
      volume: Math.floor(800 + Math.random() * 4000),
    })
    price = close
  }
  return out
}

/** Fetch candles with live/synthetic status. */
export async function fetchCandlesResult(
  asset: string,
  interval: ChartInterval = '60m',
): Promise<CandleFetchResult> {
  // 1) Optional Twelve Data key (best coverage)
  try {
    const candles = await fetchTwelveCandles(asset, interval)
    return { candles, live: true }
  } catch {
    /* continue */
  }

  // 2) Yahoo via CORS mirror / proxy
  try {
    const candles = await fetchYahooCandles(asset, interval)
    return { candles, live: true }
  } catch {
    /* continue */
  }

  // 3) Live FX spot (daily) for currency pairs — still real market price
  try {
    const candles = await fetchFxSpotCandles(asset, interval)
    return { candles, live: true }
  } catch {
    /* continue */
  }

  return { candles: syntheticCandles(asset, interval), live: false }
}

/** Fetch candles. Falls back through live sources then synthetic. */
export async function fetchCandles(
  asset: string,
  interval: ChartInterval = '60m',
): Promise<Candle[]> {
  const { candles } = await fetchCandlesResult(asset, interval)
  return candles
}

export function isKnownInstrument(asset: string): asset is Instrument {
  return asset in YAHOO_SYMBOLS
}
