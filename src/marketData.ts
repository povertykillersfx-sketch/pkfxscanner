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

const INTERVAL_META: Record<
  ChartInterval,
  { yahooInterval: string; yahooRange: string; stepMs: number }
> = {
  '15m': { yahooInterval: '15m', yahooRange: '5d', stepMs: 15 * 60 * 1000 },
  '60m': { yahooInterval: '60m', yahooRange: '10d', stepMs: 60 * 60 * 1000 },
  '240m': { yahooInterval: '60m', yahooRange: '1mo', stepMs: 4 * 60 * 60 * 1000 },
  '1d': { yahooInterval: '1d', yahooRange: '6mo', stepMs: 24 * 60 * 60 * 1000 },
}

function yahooSymbol(asset: string): string {
  return YAHOO_SYMBOLS[asset] ?? `${asset}=X`
}

/** Aggregate 1h bars into 4h bars when Yahoo has no native 4h. */
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

/** Fetch candles (Yahoo). Falls back to synthetic data if blocked/empty. */
export async function fetchCandles(
  asset: string,
  interval: ChartInterval = '60m',
): Promise<Candle[]> {
  const meta = INTERVAL_META[interval]
  const symbol = yahooSymbol(asset)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${meta.yahooInterval}&range=${meta.yahooRange}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as {
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
    const result = json.chart?.result?.[0]
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
  } catch {
    return syntheticCandles(asset, interval)
  }
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

export function isKnownInstrument(asset: string): asset is Instrument {
  return asset in YAHOO_SYMBOLS
}
