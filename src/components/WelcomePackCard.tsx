import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Gift, Package, Shirt, Truck, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { getCurrentUser } from '../auth'
import {
  SA_PROVINCES,
  WELCOME_PACK_SHIRT_COLORS,
  WELCOME_PACK_SHIRT_SIZES,
  claimWelcomePack,
  getMyWelcomePackOrder,
  listMyUnreadNotifications,
  markAllMyNotificationsRead,
  markNotificationRead,
  statusLabel,
  type WelcomePackDisplayStatus,
  type WelcomePackOrder,
  type MemberNotification,
} from '../welcomePack'
import './WelcomePackCard.css'

const STEPS: WelcomePackDisplayStatus[] = [
  'not_claimed',
  'pending',
  'processing',
  'shipped',
  'delivered',
]

function statusIcon(status: WelcomePackDisplayStatus) {
  switch (status) {
    case 'not_claimed':
      return Gift
    case 'pending':
      return Clock3
    case 'processing':
      return Package
    case 'shipped':
      return Truck
    case 'delivered':
      return CheckCircle2
  }
}

function useWelcomePack() {
  const [order, setOrder] = useState<WelcomePackOrder | null>(() => getMyWelcomePackOrder())
  const [notifs, setNotifs] = useState<MemberNotification[]>(() => listMyUnreadNotifications())

  useEffect(() => {
    function refresh() {
      setOrder(getMyWelcomePackOrder())
      setNotifs(listMyUnreadNotifications())
    }
    window.addEventListener('pkfx-welcome-pack-change', refresh)
    window.addEventListener('pkfx-member-notifications-change', refresh)
    window.addEventListener('pkfx-member-notifications-read-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('pkfx-welcome-pack-change', refresh)
      window.removeEventListener('pkfx-member-notifications-change', refresh)
      window.removeEventListener('pkfx-member-notifications-read-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return { order, notifs, refresh: () => {
    setOrder(getMyWelcomePackOrder())
    setNotifs(listMyUnreadNotifications())
  } }
}

export function WelcomePackCard() {
  const user = getCurrentUser()
  const { order, notifs, refresh } = useWelcomePack()
  const [openForm, setOpenForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    province: 'Gauteng',
    postalCode: '',
    shirtSize: 'L',
    shirtColor: 'Midnight Black' as string,
  })

  const displayStatus: WelcomePackDisplayStatus = order?.status ?? 'not_claimed'
  const StatusIcon = statusIcon(displayStatus)
  const activeStep = STEPS.indexOf(displayStatus)

  const timeline = useMemo(
    () =>
      STEPS.map((step, i) => ({
        step,
        label: statusLabel(step),
        done: i <= activeStep && displayStatus !== 'not_claimed' ? i > 0 : false,
        current: step === displayStatus,
      })),
    [activeStep, displayStatus],
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    const err = claimWelcomePack(form)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setOpenForm(false)
    setSuccess('Welcome Pack claimed — we’ll update you as it moves.')
    refresh()
  }

  if (!user || user.role !== 'client') return null

  return (
    <section className="welcome-pack panel panel-glow animate-fade-up">
      <div className="welcome-pack-aura" aria-hidden />
      <div className="welcome-pack-head">
        <div className="welcome-pack-brand">
          <span className="welcome-pack-badge">
            <Sparkles size={13} />
            Inner Circle exclusive
          </span>
          <h2 className="font-display">
            {displayStatus === 'not_claimed'
              ? 'Claim your PKFX Welcome Pack'
              : 'Your PKFX Welcome Pack'}
          </h2>
          <p className="welcome-pack-sub">
            {displayStatus === 'not_claimed'
              ? 'A premium member gift — tee + Inner Circle essentials, shipped to your door.'
              : 'Track your exclusive pack from claim through delivery.'}
          </p>
        </div>
        <div className={`welcome-pack-status-chip status-${displayStatus}`}>
          <StatusIcon size={16} />
          <span>{statusLabel(displayStatus)}</span>
        </div>
      </div>

      {notifs.length > 0 && (
        <div className="welcome-pack-notifs">
          <div className="welcome-pack-notifs-head">
            <strong>Updates</strong>
            <button type="button" className="welcome-pack-link" onClick={() => markAllMyNotificationsRead()}>
              Mark all read
            </button>
          </div>
          <ul>
            {notifs.slice(0, 3).map((n) => (
              <li key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                </div>
                <button type="button" className="welcome-pack-link" onClick={() => markNotificationRead(n.id)}>
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="welcome-pack-timeline" aria-label="Welcome Pack status">
        {timeline.map(({ step, label, done, current }) => (
          <li
            key={step}
            className={`welcome-pack-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
          >
            <span className="welcome-pack-step-dot" />
            <span className="welcome-pack-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {order ? (
        <div className="welcome-pack-claimed">
          <div className="welcome-pack-meta-grid">
            <div>
              <span>Ship to</span>
              <strong>{order.name}</strong>
              <p>
                {order.address}
                <br />
                {order.province}, {order.postalCode}
              </p>
            </div>
            <div>
              <span>Tee</span>
              <strong>
                <Shirt size={14} /> {order.shirtSize} · {order.shirtColor}
              </strong>
              <p>
                {order.phone}
                <br />
                {order.email}
              </p>
            </div>
            <div>
              <span>Courier</span>
              <strong>{order.courier || 'Assigned soon'}</strong>
              <p>{order.trackingNumber ? `Tracking ${order.trackingNumber}` : 'Tracking pending'}</p>
            </div>
          </div>
          {success ? <p className="welcome-pack-success">{success}</p> : null}
        </div>
      ) : (
        <div className="welcome-pack-cta-row">
          {!openForm ? (
            <button type="button" className="btn btn-primary welcome-pack-cta" onClick={() => setOpenForm(true)}>
              <Gift size={16} />
              Submit shipping details
            </button>
          ) : null}
          {success ? <p className="welcome-pack-success">{success}</p> : null}
        </div>
      )}

      {openForm && !order ? (
        <form className="welcome-pack-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="welcome-pack-form-grid">
            <label>
              <span>Full name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoComplete="name"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
                autoComplete="tel"
                placeholder="+27…"
              />
            </label>
            <label className="welcome-pack-span-2">
              <span>Street address</span>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                required
                autoComplete="street-address"
              />
            </label>
            <label>
              <span>Province</span>
              <select
                value={form.province}
                onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                required
              >
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Postal code</span>
              <input
                value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                required
                autoComplete="postal-code"
              />
            </label>
            <label>
              <span>T-shirt size</span>
              <select
                value={form.shirtSize}
                onChange={(e) => setForm((f) => ({ ...f, shirtSize: e.target.value }))}
                required
              >
                {WELCOME_PACK_SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>T-shirt color</span>
              <select
                value={form.shirtColor}
                onChange={(e) => setForm((f) => ({ ...f, shirtColor: e.target.value }))}
                required
              >
                {WELCOME_PACK_SHIRT_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="welcome-pack-error">{error}</p> : null}

          <div className="welcome-pack-form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpenForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Claim Welcome Pack'}
            </button>
          </div>
          <p className="welcome-pack-fine">One pack per member. Claims cannot be duplicated.</p>
        </form>
      ) : null}
    </section>
  )
}
