const VISITS_KEY = 'pkfx_daily_visits_v1'
const SESSION_VISIT_KEY = 'pkfx_visit_counted'

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function readVisits(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VISITS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeVisits(map: Record<string, number>) {
  localStorage.setItem(VISITS_KEY, JSON.stringify(map))
}

/** Count one site visit per browser tab session per day. */
export function trackDailyVisit() {
  if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') return
  const day = todayKey()
  const flag = `${SESSION_VISIT_KEY}:${day}`
  if (sessionStorage.getItem(flag)) return
  const map = readVisits()
  map[day] = (map[day] || 0) + 1
  writeVisits(map)
  sessionStorage.setItem(flag, '1')
}

export function getTodayVisitCount(): number {
  return readVisits()[todayKey()] || 0
}

export function getVisitHistory(days = 14): { date: string; count: number }[] {
  const map = readVisits()
  const out: { date: string; count: number }[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const key = todayKey(d)
    out.push({ date: key, count: map[key] || 0 })
  }
  return out
}

export function averageDailyVisits(days = 7): number {
  const hist = getVisitHistory(days)
  const sum = hist.reduce((a, b) => a + b.count, 0)
  return Math.round(sum / Math.max(hist.length, 1))
}
