/** Live forex economic calendar via TradingView events API (proxied). */

export type CalendarImpact = 'High' | 'Medium' | 'Low' | 'Holiday'

export interface CalendarEvent {
  id: string
  title: string
  country: string
  countryName: string
  date: Date
  impact: CalendarImpact
  actual: string
  forecast: string
  prior: string
}

interface TvEvent {
  id?: string | number
  title?: string
  country?: string
  currency?: string
  date?: string
  importance?: number
  actual?: number | string | null
  previous?: number | string | null
  forecast?: number | string | null
  unit?: string | null
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  EU: 'Eurozone',
  EMU: 'Eurozone',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  JP: 'Japan',
  AU: 'Australia',
  CA: 'Canada',
  NZ: 'New Zealand',
  CH: 'Switzerland',
  CN: 'China',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  KR: 'South Korea',
}

const FOREX_COUNTRIES = 'US,EU,GB,JP,AU,CA,NZ,CH,CN,DE,FR,IT,ES'

function formatValue(value: number | string | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || '—'
  }
  if (!Number.isFinite(value)) return '—'

  const abs = Math.abs(value)
  let text: string
  if (abs >= 1_000_000_000_000) text = `${trimNum(value / 1_000_000_000_000)}T`
  else if (abs >= 1_000_000_000) text = `${trimNum(value / 1_000_000_000)}B`
  else if (abs >= 1_000_000) text = `${trimNum(value / 1_000_000)}M`
  else if (abs >= 1000) text = `${trimNum(value / 1000)}K`
  else text = trimNum(value)

  const u = (unit ?? '').trim()
  if (!u) return text
  if (u === '%') return `${text}%`
  if (u.length <= 3) return `${text} ${u}`
  return text
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) >= 10 ? 1 : 2).replace(/\.?0+$/, '')
}

function impactFromImportance(importance: number | undefined): CalendarImpact {
  if (importance === 1) return 'High'
  if (importance === 0) return 'Medium'
  return 'Low'
}

function parseTv(raw: TvEvent): CalendarEvent | null {
  if (!raw.title || !raw.date || !raw.country) return null
  const country = raw.country.toUpperCase()
  const date = new Date(raw.date)
  if (Number.isNaN(date.getTime())) return null
  return {
    id: String(raw.id ?? `${country}-${raw.date}-${raw.title}`),
    title: raw.title,
    country,
    countryName: COUNTRY_NAMES[country] ?? country,
    date,
    impact: impactFromImportance(raw.importance),
    actual: formatValue(raw.actual, raw.unit),
    forecast: formatValue(raw.forecast, raw.unit),
    prior: formatValue(raw.previous, raw.unit),
  }
}

function rangeQuery(): string {
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 1)
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date()
  to.setUTCDate(to.getUTCDate() + 7)
  to.setUTCHours(23, 59, 59, 999)
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    countries: FOREX_COUNTRIES,
  })
  return params.toString()
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(18_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function parsePayload(json: unknown): CalendarEvent[] {
  const rows = Array.isArray(json)
    ? json
    : Array.isArray((json as { result?: unknown }).result)
      ? ((json as { result: TvEvent[] }).result)
      : null
  if (!rows) throw new Error('bad calendar payload')
  return rows.map(parseTv).filter((e): e is CalendarEvent => !!e)
}

async function fetchViaProxy(): Promise<CalendarEvent[]> {
  const json = await fetchJson(`/api/tv-calendar?${rangeQuery()}`)
  return parsePayload(json)
}

async function fetchViaJina(): Promise<CalendarEvent[]> {
  const upstream = `https://economic-calendar.tradingview.com/events?${rangeQuery()}`
  const json = (await fetchJson(`https://r.jina.ai/${upstream}`, {
    headers: { Accept: 'application/json' },
  })) as { data?: { content?: string }; content?: string }
  const content = json.data?.content ?? json.content
  if (!content) throw new Error('jina empty')
  const parsed = typeof content === 'string' ? JSON.parse(content) : content
  return parsePayload(parsed)
}

export async function loadForexCalendar(): Promise<CalendarEvent[]> {
  try {
    return await fetchViaProxy()
  } catch {
    return fetchViaJina()
  }
}

export function flagEmoji(countryCode: string): string {
  const map: Record<string, string> = {
    US: '🇺🇸',
    EU: '🇪🇺',
    EMU: '🇪🇺',
    GB: '🇬🇧',
    UK: '🇬🇧',
    JP: '🇯🇵',
    AU: '🇦🇺',
    CA: '🇨🇦',
    NZ: '🇳🇿',
    CH: '🇨🇭',
    CN: '🇨🇳',
    DE: '🇩🇪',
    FR: '🇫🇷',
    IT: '🇮🇹',
    ES: '🇪🇸',
    KR: '🇰🇷',
  }
  return map[countryCode] ?? '🌐'
}
