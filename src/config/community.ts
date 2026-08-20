/** Community hub defaults — Admin Events can override via localStorage. */

export type CommunityChannelKind = 'telegram' | 'discord' | 'youtube' | 'whatsapp' | 'web'

export interface CommunityChannel {
  id: string
  name: string
  description: string
  url: string
  kind: CommunityChannelKind
  cta: string
  featured?: boolean
}

export interface LiveSession {
  id: string
  title: string
  /** 0 = Sunday … 6 = Saturday. Omit for daily (every day). */
  weekday?: number
  /** Weekdays only when true (Mon–Fri). Ignored if weekday is set. */
  weekdaysOnly?: boolean
  /** Local time in `timezone`, 24h "HH:mm" */
  time: string
  timezone: string
  durationMinutes: number
  description?: string
  joinUrl?: string
}

export interface CommunityResource {
  id: string
  title: string
  description: string
  url: string
  category: 'broker' | 'prop' | 'other'
}

export interface CommunitySettings {
  channels: CommunityChannel[]
  sessions: LiveSession[]
  resources: CommunityResource[]
}

function envUrl(key: string): string {
  try {
    return (
      (typeof import.meta !== 'undefined' &&
        (import.meta.env[key] as string | undefined)?.trim()) ||
      ''
    )
  } catch {
    return ''
  }
}

export const DEFAULT_COMMUNITY: CommunitySettings = {
  channels: [
    {
      id: 'telegram-inner',
      name: 'Inner Circle Telegram',
      description: 'Private member chat — setups, support, and daily discussion.',
      url: envUrl('VITE_TELEGRAM_INNER_URL'),
      kind: 'telegram',
      cta: 'Open Telegram',
      featured: true,
    },
    {
      id: 'discord',
      name: 'PKFX Discord',
      description: 'Voice rooms, live session alerts, and trade sharing.',
      url: envUrl('VITE_DISCORD_URL'),
      kind: 'discord',
      cta: 'Join Discord',
      featured: true,
    },
    {
      id: 'telegram-free',
      name: 'Free Telegram Group',
      description: 'Public market notes and community updates.',
      url: envUrl('VITE_TELEGRAM_FREE_URL'),
      kind: 'telegram',
      cta: 'Join Free Group',
    },
    {
      id: 'youtube',
      name: 'YouTube Live',
      description: 'Watch live trading streams and recorded sessions.',
      url: envUrl('VITE_YOUTUBE_URL'),
      kind: 'youtube',
      cta: 'Watch on YouTube',
    },
  ],
  /** Empty until admin adds sessions — never invent upcoming times for clients. */
  sessions: [],
  resources: [
    {
      id: 'broker-exness',
      title: 'Broker sign-up — Exness',
      description: 'Open a live or demo account to trade PKFX setups.',
      url: 'https://www.exness.com/',
      category: 'broker',
    },
    {
      id: 'broker-ic',
      title: 'Broker sign-up — IC Markets',
      description: 'Raw spreads and fast execution for FX & metals.',
      url: 'https://www.icmarkets.com/',
      category: 'broker',
    },
    {
      id: 'prop-ftmo',
      title: 'Prop firm — FTMO',
      description: 'Challenge a funded account if you prefer prop capital.',
      url: 'https://ftmo.com/',
      category: 'prop',
    },
    {
      id: 'prop-fundingpips',
      title: 'Prop firm — FundingPips',
      description: 'Popular prop evaluations for day and swing traders.',
      url: 'https://fundingpips.com/',
      category: 'prop',
    },
  ],
}

export interface UpcomingOccurrence {
  session: LiveSession
  startsAt: Date
  endsAt: Date
  label: string
  timeLabel: string
  relative: string
}

function parseHm(time: string): { h: number; m: number } {
  const [hs, ms] = time.split(':')
  return { h: Number(hs) || 0, m: Number(ms) || 0 }
}

/** Wall-clock parts for a date in a given IANA timezone. */
function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday || 'Mon'] ?? 1,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

/**
 * Build a Date for a local wall time in `timeZone` on the calendar day
 * matching `year-month-day` in that zone (approximate via offset probe).
 */
function zonedDate(year: number, month: number, day: number, h: number, m: number, timeZone: string): Date {
  const utcGuess = Date.UTC(year, month - 1, day, h, m, 0)
  const probe = zonedParts(new Date(utcGuess), timeZone)
  const desiredAsMinutes = ((h * 60 + m) | 0)
  const actualAsMinutes = probe.hour * 60 + probe.minute
  let deltaMin = desiredAsMinutes - actualAsMinutes
  // Also correct day drift
  const desiredDayKey = year * 400 + month * 32 + day
  const actualDayKey = probe.year * 400 + probe.month * 32 + probe.day
  deltaMin += (desiredDayKey - actualDayKey) * 24 * 60
  return new Date(utcGuess + deltaMin * 60_000)
}

function sessionMatchesDay(session: LiveSession, weekday: number): boolean {
  if (typeof session.weekday === 'number') return session.weekday === weekday
  if (session.weekdaysOnly) return weekday >= 1 && weekday <= 5
  return true
}

function formatRelative(startsAt: Date, now: Date): string {
  const diffMs = startsAt.getTime() - now.getTime()
  if (diffMs <= 0) {
    return 'Live now'
  }
  const mins = Math.round(diffMs / 60_000)
  if (mins < 60) return `In ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `In ${hours}h ${mins % 60}m`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export function getUpcomingSessions(
  sessions: LiveSession[],
  limit = 6,
  now = new Date(),
): UpcomingOccurrence[] {
  const out: UpcomingOccurrence[] = []
  const horizonDays = 21

  for (const session of sessions) {
    const tz = session.timezone || 'Africa/Johannesburg'
    const { h, m } = parseHm(session.time)
    const nowParts = zonedParts(now, tz)

    for (let offset = 0; offset < horizonDays; offset++) {
      // Walk calendar day in zone from "today" in that timezone
      const dayBase = zonedDate(nowParts.year, nowParts.month, nowParts.day, 12, 0, tz)
      const dayDate = new Date(dayBase.getTime() + offset * 86_400_000)
      const parts = zonedParts(dayDate, tz)
      if (!sessionMatchesDay(session, parts.weekday)) continue

      const startsAt = zonedDate(parts.year, parts.month, parts.day, h, m, tz)
      const endsAt = new Date(startsAt.getTime() + session.durationMinutes * 60_000)
      if (endsAt.getTime() < now.getTime()) continue

      const label = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(startsAt)

      const timeLabel = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      }).format(startsAt)

      out.push({
        session,
        startsAt,
        endsAt,
        label,
        timeLabel,
        relative: formatRelative(startsAt, now),
      })
    }
  }

  return out
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, limit)
}

export function channelAccent(kind: CommunityChannelKind): string {
  switch (kind) {
    case 'telegram':
      return '#2AABEE'
    case 'discord':
      return '#5865F2'
    case 'youtube':
      return '#FF0033'
    case 'whatsapp':
      return '#25D366'
    default:
      return 'var(--neon-bright, #bf00ff)'
  }
}
