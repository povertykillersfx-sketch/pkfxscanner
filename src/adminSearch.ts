import type { UserProfile } from '../auth'

function surnameOf(m: UserProfile): string {
  if (m.surname?.trim()) return m.surname.trim()
  const parts = (m.fullName || '').trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : ''
}

/** Match clients by first name, surname, full name, email, or phone digits/text. */
export function matchesClientSearch(member: UserProfile, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const phoneDigits = (member.phone || '').replace(/\D/g, '')
  const queryDigits = q.replace(/\D/g, '')

  const haystack = [
    member.firstName || '',
    surnameOf(member),
    member.fullName || '',
    member.email || '',
    member.phone || '',
    member.country || '',
  ]
    .join(' ')
    .toLowerCase()

  if (haystack.includes(q)) return true
  if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits)) return true
  return false
}

export function filterClients<T extends UserProfile>(list: T[], query: string): T[] {
  return list.filter((m) => matchesClientSearch(m, query))
}
