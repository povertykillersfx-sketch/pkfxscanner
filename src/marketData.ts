import type { Instrument } from './data/mockData'

/** Yahoo Finance chart symbols — aligned to what traders see on the in-app chart */
const YAHOO_SYMBOLS: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  NZDUSD: 'NZDUSD=X',
  USDZAR: 'ZAR=X',
  GOLD: 'GC=F',
  US30: '^DJI',
  NASDAQ: '^NDX',
  AUDUSD: 'AUDUSD=X',
}

/** TradingView quote symbols — must match chart embeds in mockData TRADINGVIEW_SYMBOLS */
const TV_SYMBOLS: Record<string, string> = {
  EURUSD: 'FX:EURUSD',
  GBPUSD: 'FX:GBPUSD',
  USDJPY: 'FX:USDJPY',
  NZDUSD: 'FX:NZDUSD',
  USDZAR: 'FX:USDZAR',
  GOLD: 'OANDA:XAUUSD',
  US30: 'FOREXCOM:US30',
  NASDAQ: 'NASDAQ:NDX',
  AUDUSD: 'FX:AUDUSD',
}

/** Twelve Data symbols (optional; set VITE_TWELVEDATA_API_KEY) */
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
export type MarketSource = 'yahoo' | 'twelve' | 'frankfurter' | 'tradingview-spot' | 'synthetic'

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
  /** True only when bars are real market OHLC (not synthetic) */
  live: boolean
  source: MarketSource
  /** Last traded / regular market price when known */
  spot?: number
}

export interface LiveQuote {
  asset: string
  price: number
  changePct?: number
  high?: number
  low?: number
  source: MarketSource
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

function yahooSymbol(asset: string): string {
  return YAHOO_SYMBOLS[asset] ?? `${asset}=X`
}

function yahooChartPath(symbol: string, interval: ChartInterval): string {
  const meta = INTERVAL_META[interval]
  return `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${meta.yahooInterval}&range=${meta.yahooRange}`
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

function parseYahooChart(json: unknown, interval: ChartInterval): { candles: Candle[]; spot?: number } {
  const data = json as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number }
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
  if (!times.length || !quote) throw new Error('empty yahoo')

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
  if (candles.length < 20) throw new Error('too few yahoo bars')
  const spot = result?.meta?.regularMarketPrice ?? candles[candles.length - 1]?.close
  return { candles, spot }
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(16_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Jina reader returns { data: { content: "<yahoo json string>" } } with CORS. */
async function fetchYahooViaJina(symbol: string, interval: ChartInterval): Promise<{ candles: Candle[]; spot?: number }> {
  const path = yahooChartPath(symbol, interval)
  const upstream = `http://query2.finance.yahoo.com${path}`
  const url = `https://r.jina.ai/${upstream}`
  const json = (await fetchJson(url, {
    headers: { Accept: 'application/json' },
  })) as { data?: { content?: string }; content?: string }
  const content = json.data?.content ?? json.content
  if (!content) throw new Error('jina empty')
  const chartJson = typeof content === 'string' ? JSON.parse(content) : content
  return parseYahooChart(chartJson, interval)
}

/** Same-origin Vite/preview proxy → query2 Yahoo. */
async function fetchYahooViaProxy(symbol: string, interval: ChartInterval): Promise<{ candles: Candle[]; spot?: number }> {
  const path = yahooChartPath(symbol, interval)
  const json = await fetchJson(`/api/yahoo${path}`)
  return parseYahooChart(json, interval)
}

async function fetchYahooDirect(symbol: string, interval: ChartInterval): Promise<{ candles: Candle[]; spot?: number }> {
  const path = yahooChartPath(symbol, interval)
  const json = await fetchJson(`https://query2.finance.yahoo.com${path}`)
  return parseYahooChart(json, interval)
}

/** Frankfurter daily history — real FX closes when intraday Yahoo is blocked. */
async function fetchFrankfurterDaily(asset: string): Promise<{ candles: Candle[]; spot?: number }> {
  const map: Record<string, { from: string; to: string; invert?: boolean }> = {
    EURUSD: { from: 'EUR', to: 'USD' },
    GBPUSD: { from: 'GBP', to: 'USD' },
    USDJPY: { from: 'USD', to: 'JPY' },
    AUDUSD: { from: 'AUD', to: 'USD' },
    NZDUSD: { from: 'NZD', to: 'USD' },
    USDZAR: { from: 'USD', to: 'ZAR' },
  }
  const cfg = map[asset]
  if (!cfg) throw new Error('not fx frankfurter')

  const end = new Date()
  const start = new Date(end.getTime() - 120 * 24 * 60 * 60 * 1000)
  const startStr = start.toISOString().slice(0, 10)
  const url = `https://api.frankfurter.app/${startStr}..?from=${cfg.from}&to=${cfg.to}`
  const json = (await fetchJson(url)) as { rates?: Record<string, Record<string, number>> }
  if (!json.rates) throw new Error('no frankfurter rates')

  const candles: Candle[] = Object.entries(json.rates)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, rates]) => {
      let close = rates[cfg.to]
      if (close == null) throw new Error('missing rate')
      // frankfurter from EUR to USD gives EURUSD directly when from=EUR to=USD
      return {
        timestamp: Date.parse(`${date}T00:00:00Z`),
        open: close,
        high: close,
        low: close,
        close,
        volume: 0,
      }
    })
  if (candles.length < 20) throw new Error('too few frankfurter')
  return { candles, spot: candles[candles.length - 1]?.close }
}

async function fetchTwelveCandles(asset: string, interval: ChartInterval): Promise<{ candles: Candle[]; spot?: number }> {
  const key = import.meta.env.VITE_TWELVEDATA_API_KEY as string | undefined
  if (!key) throw new Error('no twelve key')
  const symbol = TWELVE_SYMBOLS[asset]
  if (!symbol) throw new Error('unsupported')
  const meta = INTERVAL_META[interval]
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${meta.twelve}&outputsize=180&apikey=${encodeURIComponent(key)}`
  const json = (await fetchJson(url)) as {
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
  return { candles, spot: candles[candles.length - 1]?.close }
}

/** Live TradingView quote (CORS). Used to pin entry to real market price. */
export async function fetchTradingViewQuote(asset: string): Promise<LiveQuote> {
  const symbol = TV_SYMBOLS[asset]
  if (!symbol) throw new Error('no tv symbol')
  const url = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(symbol)}&fields=close,change,high,low,description`
  const json = (await fetchJson(url)) as {
    close?: number
    change?: number
    high?: number
    low?: number
  }
  if (json.close == null || !Number.isFinite(json.close)) throw new Error('no tv close')
  return {
    asset,
    price: json.close,
    changePct: json.change,
    high: json.high,
    low: json.low,
    source: 'tradingview-spot',
  }
}

/** Anchor last candle close to a verified live spot (keeps structure, fixes entry). */
function pinSpot(candles: Candle[], spot: number): Candle[] {
  if (!candles.length) return candles
  const out = candles.map((c) => ({ ...c }))
  const last = out[out.length - 1]!
  last.close = spot
  last.high = Math.max(last.high, spot)
  last.low = Math.min(last.low, spot)
  return out
}

const BASE: Record<string, number> = {
  EURUSD: 1.154,
  GBPUSD: 1.35,
  USDJPY: 159.3,
  NZDUSD: 0.602,
  USDZAR: 18.35,
  GOLD: 4380,
  US30: 53860,
  NASDAQ: 26460,
  AUDUSD: 0.656,
}

function syntheticCandles(asset: string, interval: ChartInterval, spot?: number): Candle[] {
  const base = spot ?? BASE[asset] ?? 1
  const now = Date.now()
  const step = INTERVAL_META[interval].stepMs
  const count = interval === '1d' ? 120 : interval === '15m' ? 240 : 180
  const out: Candle[] = []
  let price = base * 0.995
  for (let i = count; i >= 0; i--) {
    const drift = (Math.sin(i / 9) + Math.sin(i / 5) * 0.5) * base * 0.0008
    const open = price
    const close = price + drift
    const high = Math.max(open, close) + Math.abs(drift) * 0.4
    const low = Math.min(open, close) - Math.abs(drift) * 0.4
    out.push({
      timestamp: now - i * step,
      open,
      high,
      low,
      close,
      volume: Math.floor(800 + (i % 40) * 90),
    })
    price = close
  }
  return pinSpot(out, base)
}

const candleCache = new Map<string, { at: number; value: CandleFetchResult }>()
const CACHE_MS = 60_000

/** Fetch real OHLC when possible. Synthetic only as last resort (live=false). */
export async function fetchCandlesResult(
  asset: string,
  interval: ChartInterval = '15m',
): Promise<CandleFetchResult> {
  const cacheKey = `${asset}|${interval}`
  const hit = candleCache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value

  let result: CandleFetchResult

  // 1) Optional Twelve Data
  try {
    const { candles, spot } = await fetchTwelveCandles(asset, interval)
    result = { candles, live: true, source: 'twelve', spot }
    candleCache.set(cacheKey, { at: Date.now(), value: result })
    return result
  } catch {
    /* continue */
  }

  // 2) Real Yahoo OHLC — jina first (CORS + bypasses many Yahoo IP blocks), then proxy, then direct
  try {
    const symbol = yahooSymbol(asset)
    let parsed: { candles: Candle[]; spot?: number } | null = null
    const errors: string[] = []
    for (const fn of [fetchYahooViaJina, fetchYahooViaProxy, fetchYahooDirect]) {
      try {
        parsed = await fn(symbol, interval)
        break
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }
    if (!parsed) throw new Error(`yahoo failed: ${errors.join(' | ')}`)

    // Keep Yahoo OHLC intact — do NOT pin a different venue's spot onto futures/index bars
    // (e.g. XAUUSD spot onto GC=F), which invents prices the series never traded.
    const finalSpot = parsed.spot ?? parsed.candles[parsed.candles.length - 1]?.close
    result = { candles: parsed.candles, live: true, source: 'yahoo', spot: finalSpot }
    candleCache.set(cacheKey, { at: Date.now(), value: result })
    return result
  } catch {
    /* continue */
  }

  // 3) Frankfurter daily FX — only valid for daily HTF, never as fake 15m/1h bars
  if (interval === '1d') {
    try {
      const { candles, spot } = await fetchFrankfurterDaily(asset)
      result = {
        candles,
        live: true,
        source: 'frankfurter',
        spot,
      }
      candleCache.set(cacheKey, { at: Date.now(), value: result })
      return result
    } catch {
      /* continue */
    }
  }

  // 4) TradingView spot only — price is real, structure is estimated (NOT live OHLC)
  try {
    const tv = await fetchTradingViewQuote(asset)
    result = {
      candles: syntheticCandles(asset, interval, tv.price),
      live: false,
      source: 'tradingview-spot',
      spot: tv.price,
    }
    candleCache.set(cacheKey, { at: Date.now(), value: result })
    return result
  } catch {
    /* continue */
  }

  result = {
    candles: syntheticCandles(asset, interval),
    live: false,
    source: 'synthetic',
    spot: BASE[asset],
  }
  candleCache.set(cacheKey, { at: Date.now(), value: result })
  return result
}

export async function fetchCandles(
  asset: string,
  interval: ChartInterval = '15m',
): Promise<Candle[]> {
  const { candles } = await fetchCandlesResult(asset, interval)
  return candles
}

export interface MultiTimeframeFeed {
  h4: CandleFetchResult
  h1: CandleFetchResult
  m15: CandleFetchResult
  live: boolean
  spot?: number
  source: MarketSource
}

/** Assets where Yahoo OHLC venue differs from the in-app TradingView chart. */
const CHART_SPOT_PREFERRED = new Set(['GOLD', 'US30', 'NASDAQ'])

/**
 * Choose the entry/spot traders will recognize on the chart.
 * GOLD/indices: prefer TradingView (matches embedded chart).
 * FX: adopt TV only when it sits inside recent Yahoo OHLC (same market).
 */
function resolveAlertSpot(
  asset: string,
  candleSpot: number | undefined,
  candles: Candle[],
  tvPrice?: number,
): number | undefined {
  const fallback = candleSpot ?? candles[candles.length - 1]?.close
  if (tvPrice == null || !Number.isFinite(tvPrice)) return fallback

  if (CHART_SPOT_PREFERRED.has(asset)) {
    return tvPrice
  }

  const recent = candles.slice(-96)
  if (recent.length < 4) return fallback ?? tvPrice

  const hi = Math.max(...recent.map((c) => c.high))
  const lo = Math.min(...recent.map((c) => c.low))
  const pad = Math.max((hi - lo) * 0.03, Math.abs(tvPrice) * 0.0006)
  if (tvPrice >= lo - pad && tvPrice <= hi + pad) return tvPrice
  return fallback
}

export async function fetchMultiTimeframe(asset: string): Promise<MultiTimeframeFeed> {
  // One 60m pull covers 1H + aggregated 4H (fewer upstream calls → fewer rate limits)
  const [h1raw, m15] = await Promise.all([
    fetchCandlesResult(asset, '60m'),
    fetchCandlesResult(asset, '15m'),
  ])

  const h4Candles =
    h1raw.live && h1raw.candles.length >= 40
      ? aggregateBars(h1raw.candles, 4)
      : h1raw.candles
  const h4: CandleFetchResult = {
    candles: h4Candles,
    live: h1raw.live,
    source: h1raw.source,
    spot: h1raw.spot,
  }
  const h1 = h1raw

  const candleSpot = m15.candles[m15.candles.length - 1]?.close ?? h1.spot ?? h4.spot
  let tvPrice: number | undefined
  try {
    const tv = await fetchTradingViewQuote(asset)
    tvPrice = tv.price
  } catch {
    /* optional */
  }

  const spot = resolveAlertSpot(asset, candleSpot, m15.candles, tvPrice)

  const live = h4.live && h1.live && m15.live
  const source: MarketSource = live
    ? m15.source
    : m15.source === 'synthetic' && h1.source === 'synthetic'
      ? 'synthetic'
      : m15.source

  // Pin only the last 15m close to chart-aligned spot so entry = what traders see now
  const m15Pinned =
    spot != null && Number.isFinite(spot) ? { ...m15, candles: pinSpot(m15.candles, spot), spot } : { ...m15, spot }

  return {
    h4: { ...h4, spot },
    h1: { ...h1, spot },
    m15: m15Pinned,
    live,
    spot,
    source,
  }
}

export function isKnownInstrument(asset: string): asset is Instrument {
  return asset in YAHOO_SYMBOLS
}
