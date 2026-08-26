import { publishSharedContent } from './adminStore'
import { getCurrentUser } from './auth'

export type WelcomePackStatus = 'pending' | 'processing' | 'shipped' | 'delivered'

export type WelcomePackDisplayStatus = 'not_claimed' | WelcomePackStatus

export interface WelcomePackOrder {
  id: string
  /** Account email that owns this claim (unique) */
  memberEmail: string
  name: string
  email: string
  phone: string
  address: string
  province: string
  postalCode: string
  shirtSize: string
  shirtColor: string
  status: WelcomePackStatus
  courier: string
  trackingNumber: string
  createdAt: string
  updatedAt: string
  statusUpdatedAt: string
}

export interface MemberNotification {
  id: string
  email: string
  title: string
  body: string
  createdAt: string
  relatedOrderId?: string
  kind: 'welcome_pack'
}

const ORDERS_KEY = 'pkfx_welcome_pack_orders_v1'
const NOTIFS_KEY = 'pkfx_member_notifications_v1'
const READ_NOTIFS_KEY = 'pkfx_member_notifications_read_v1'

export const WELCOME_PACK_STATUSES: WelcomePackStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
]

export const WELCOME_PACK_SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export const WELCOME_PACK_SHIRT_COLORS = ['Black', 'White'] as const

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
  'Outside South Africa',
] as const

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readOrders(): WelcomePackOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WelcomePackOrder[]
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : []
  } catch {
    return []
  }
}

function writeOrders(orders: WelcomePackOrder[], opts?: { silent?: boolean; skipPublish?: boolean }) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  if (!opts?.silent) {
    window.dispatchEvent(new CustomEvent('pkfx-welcome-pack-change', { detail: orders }))
  }
  if (!opts?.skipPublish) {
    void publishSharedContent()
  }
}

function readNotifications(): MemberNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MemberNotification[]
    return Array.isArray(parsed) ? parsed.map(normalizeNotification) : []
  } catch {
    return []
  }
}

function writeNotifications(
  notifs: MemberNotification[],
  opts?: { silent?: boolean; skipPublish?: boolean },
) {
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs))
  if (!opts?.silent) {
    window.dispatchEvent(new CustomEvent('pkfx-member-notifications-change', { detail: notifs }))
  }
  if (!opts?.skipPublish) {
    void publishSharedContent()
  }
}

function normalizeStatus(raw: unknown): WelcomePackStatus {
  return WELCOME_PACK_STATUSES.includes(raw as WelcomePackStatus)
    ? (raw as WelcomePackStatus)
    : 'pending'
}

function normalizeOrder(raw: Partial<WelcomePackOrder> & { id: string }): WelcomePackOrder {
  const createdAt = raw.createdAt || new Date().toISOString()
  return {
    id: raw.id,
    memberEmail: normalizeEmail(raw.memberEmail || raw.email || ''),
    name: (raw.name || '').trim(),
    email: normalizeEmail(raw.email || raw.memberEmail || ''),
    phone: (raw.phone || '').trim(),
    address: (raw.address || '').trim(),
    province: (raw.province || '').trim(),
    postalCode: (raw.postalCode || '').trim(),
    shirtSize: (raw.shirtSize || '').trim().toUpperCase(),
    shirtColor: (raw.shirtColor || '').trim(),
    status: normalizeStatus(raw.status),
    courier: (raw.courier || '').trim(),
    trackingNumber: (raw.trackingNumber || '').trim(),
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
    statusUpdatedAt: raw.statusUpdatedAt || raw.updatedAt || createdAt,
  }
}

function normalizeNotification(
  raw: Partial<MemberNotification> & { id: string },
): MemberNotification {
  return {
    id: raw.id,
    email: normalizeEmail(raw.email || ''),
    title: (raw.title || '').trim(),
    body: (raw.body || '').trim(),
    createdAt: raw.createdAt || new Date().toISOString(),
    relatedOrderId: raw.relatedOrderId,
    kind: 'welcome_pack',
  }
}

export function statusLabel(status: WelcomePackDisplayStatus): string {
  switch (status) {
    case 'not_claimed':
      return 'Not claimed'
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
  }
}

function statusMessage(order: WelcomePackOrder): { title: string; body: string } {
  const sizeColor = `${order.shirtSize} · ${order.shirtColor}`
  switch (order.status) {
    case 'pending':
      return {
        title: 'Welcome Pack received',
        body: `Your PKFX Welcome Pack claim is pending review (${sizeColor}).`,
      }
    case 'processing':
      return {
        title: 'Welcome Pack processing',
        body: `We’re preparing your exclusive PKFX Welcome Pack (${sizeColor}).`,
      }
    case 'shipped':
      return {
        title: 'Welcome Pack shipped',
        body: order.courier
          ? `Your pack is on the way via ${order.courier}${
              order.trackingNumber ? ` · tracking ${order.trackingNumber}` : ''
            }.`
          : `Your PKFX Welcome Pack has shipped${
              order.trackingNumber ? ` · tracking ${order.trackingNumber}` : ''
            }.`,
      }
    case 'delivered':
      return {
        title: 'Welcome Pack delivered',
        body: 'Your PKFX Welcome Pack has been marked delivered. Enjoy the Inner Circle.',
      }
  }
}

export function listWelcomePackOrders(): WelcomePackOrder[] {
  return [...readOrders()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function getWelcomePackOrderForEmail(email: string): WelcomePackOrder | null {
  const key = normalizeEmail(email)
  if (!key) return null
  return listWelcomePackOrders().find((o) => o.memberEmail === key) ?? null
}

export function getMyWelcomePackOrder(): WelcomePackOrder | null {
  const user = getCurrentUser()
  if (!user) return null
  return getWelcomePackOrderForEmail(user.email)
}

export function getMyWelcomePackDisplayStatus(): WelcomePackDisplayStatus {
  return getMyWelcomePackOrder()?.status ?? 'not_claimed'
}

export type ClaimWelcomePackInput = {
  name: string
  email: string
  phone: string
  address: string
  province: string
  postalCode: string
  shirtSize: string
  shirtColor: string
}

/** Submit a claim. Returns error message or null on success. */
export function claimWelcomePack(input: ClaimWelcomePackInput): string | null {
  const user = getCurrentUser()
  if (!user || user.role !== 'client') return 'Sign in as a member to claim your pack.'

  const memberEmail = normalizeEmail(user.email)
  if (getWelcomePackOrderForEmail(memberEmail)) {
    return 'You have already claimed your PKFX Welcome Pack.'
  }

  const name = input.name.trim()
  const email = normalizeEmail(input.email || memberEmail)
  const phone = input.phone.trim()
  const address = input.address.trim()
  const province = input.province.trim()
  const postalCode = input.postalCode.trim()
  const shirtSize = input.shirtSize.trim().toUpperCase()
  const shirtColor = input.shirtColor.trim()

  if (!name) return 'Name is required.'
  if (!email) return 'Email is required.'
  if (!phone) return 'Phone is required.'
  if (!address) return 'Address is required.'
  if (!province) return 'Province is required.'
  if (!postalCode) return 'Postal code is required.'
  if (!shirtSize) return 'T-shirt size is required.'
  if (!shirtColor) return 'T-shirt color is required.'

  const now = new Date().toISOString()
  const order = normalizeOrder({
    id: newId('wp'),
    memberEmail,
    name,
    email,
    phone,
    address,
    province,
    postalCode,
    shirtSize,
    shirtColor,
    status: 'pending',
    courier: '',
    trackingNumber: '',
    createdAt: now,
    updatedAt: now,
    statusUpdatedAt: now,
  })

  const msg = statusMessage(order)
  const notif = normalizeNotification({
    id: newId('mn'),
    email: memberEmail,
    title: msg.title,
    body: msg.body,
    createdAt: now,
    relatedOrderId: order.id,
    kind: 'welcome_pack',
  })

  writeOrders([order, ...readOrders()], { skipPublish: true })
  writeNotifications([notif, ...readNotifications()])
  return null
}

export function updateWelcomePackOrder(
  id: string,
  patch: Partial<
    Pick<WelcomePackOrder, 'status' | 'courier' | 'trackingNumber' | 'name' | 'phone' | 'address'>
  >,
): WelcomePackOrder | null {
  const orders = readOrders()
  const idx = orders.findIndex((o) => o.id === id)
  if (idx < 0) return null

  const prev = orders[idx]!
  const now = new Date().toISOString()
  const statusChanged = Boolean(patch.status && patch.status !== prev.status)

  const next = normalizeOrder({
    ...prev,
    ...patch,
    id: prev.id,
    memberEmail: prev.memberEmail,
    updatedAt: now,
    statusUpdatedAt: statusChanged ? now : prev.statusUpdatedAt,
  })

  orders[idx] = next

  if (statusChanged) {
    const msg = statusMessage(next)
    const notif = normalizeNotification({
      id: newId('mn'),
      email: next.memberEmail,
      title: msg.title,
      body: msg.body,
      createdAt: now,
      relatedOrderId: next.id,
      kind: 'welcome_pack',
    })
    writeOrders(orders, { skipPublish: true })
    writeNotifications([notif, ...readNotifications()])
  } else {
    writeOrders(orders)
  }

  return next
}

export function deleteWelcomePackOrder(id: string) {
  writeOrders(readOrders().filter((o) => o.id !== id))
}

export function listMemberNotifications(): MemberNotification[] {
  return [...readNotifications()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function listNotificationsForEmail(email: string): MemberNotification[] {
  const key = normalizeEmail(email)
  return listMemberNotifications().filter((n) => n.email === key)
}

export function listMyNotifications(): MemberNotification[] {
  const user = getCurrentUser()
  if (!user) return []
  return listNotificationsForEmail(user.email)
}

function readReadIds(): Set<string> {
  try {
    const user = getCurrentUser()
    if (!user) return new Set()
    const raw = localStorage.getItem(READ_NOTIFS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as Record<string, string[]>
    const list = parsed[normalizeEmail(user.email)]
    return new Set(Array.isArray(list) ? list : [])
  } catch {
    return new Set()
  }
}

function writeReadIds(ids: Set<string>) {
  const user = getCurrentUser()
  if (!user) return
  let parsed: Record<string, string[]> = {}
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY)
    if (raw) parsed = JSON.parse(raw) as Record<string, string[]>
  } catch {
    parsed = {}
  }
  parsed[normalizeEmail(user.email)] = [...ids]
  localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(parsed))
  window.dispatchEvent(new CustomEvent('pkfx-member-notifications-read-change'))
}

export function listMyUnreadNotifications(): MemberNotification[] {
  const read = readReadIds()
  return listMyNotifications().filter((n) => !read.has(n.id))
}

export function markNotificationRead(id: string) {
  const read = readReadIds()
  read.add(id)
  writeReadIds(read)
}

export function markAllMyNotificationsRead() {
  const read = readReadIds()
  for (const n of listMyNotifications()) read.add(n.id)
  writeReadIds(read)
}

export function replaceWelcomePackFromSync(
  orders: unknown[],
  notifications: unknown[],
  opts?: { silent?: boolean },
) {
  const nextOrders = (Array.isArray(orders) ? orders : [])
    .filter((o): o is Partial<WelcomePackOrder> & { id: string } =>
      Boolean(o && typeof o === 'object' && 'id' in o && (o as { id: unknown }).id),
    )
    .map(normalizeOrder)

  const nextNotifs = (Array.isArray(notifications) ? notifications : [])
    .filter((n): n is Partial<MemberNotification> & { id: string } =>
      Boolean(n && typeof n === 'object' && 'id' in n && (n as { id: unknown }).id),
    )
    .map(normalizeNotification)

  writeOrders(nextOrders, { silent: opts?.silent, skipPublish: true })
  writeNotifications(nextNotifs, { silent: opts?.silent, skipPublish: true })
}

export function listWelcomePackOrdersForSync(): WelcomePackOrder[] {
  return readOrders()
}

export function listMemberNotificationsForSync(): MemberNotification[] {
  return readNotifications()
}
