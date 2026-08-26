import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Check, X } from 'lucide-react'
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
  type WelcomePackOrder,
  type MemberNotification,
} from '../welcomePack'
import './WelcomePackCard.css'

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

  return {
    order,
    notifs,
    refresh: () => {
      setOrder(getMyWelcomePackOrder())
      setNotifs(listMyUnreadNotifications())
    },
  }
}

export function WelcomePackCard() {
  const user = getCurrentUser()
  const { order, notifs, refresh } = useWelcomePack()
  const [openForm, setOpenForm] = useState(false)
  const [openStatus, setOpenStatus] = useState(false)
  const [error, setError] = useState('')
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

  useEffect(() => {
    if (!openForm && !openStatus) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenForm(false)
        setOpenStatus(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [openForm, openStatus])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const err = claimWelcomePack(form)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setOpenForm(false)
    refresh()
  }

  if (!user || user.role !== 'client') return null

  const claimed = Boolean(order)

  return (
    <div className="welcome-pack-wrap animate-fade-up">
      {claimed ? (
        <button
          type="button"
          className="welcome-pack-banner is-claimed"
          onClick={() => setOpenStatus(true)}
        >
          <span>
            Welcome Pack: Claimed <Check size={15} strokeWidth={2.75} aria-hidden />
          </span>
          <span className="welcome-pack-banner-meta">{statusLabel(order!.status)}</span>
        </button>
      ) : (
        <button type="button" className="welcome-pack-banner" onClick={() => setOpenForm(true)}>
          <span>PKFX Welcome Pack — Claim Yours</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </button>
      )}

      {notifs.length > 0 && (
        <div className="welcome-pack-toast">
          <p>
            <strong>{notifs[0]!.title}</strong>
            <span>{notifs[0]!.body}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              markNotificationRead(notifs[0]!.id)
              if (notifs.length <= 1) markAllMyNotificationsRead()
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {openForm && !order
        ? createPortal(
            <div className="overlay welcome-pack-overlay" onClick={() => setOpenForm(false)}>
              <div
                className="modal modal-wide welcome-pack-modal animate-fade-up"
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-pack-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={() => setOpenForm(false)}
                >
                  <X size={16} />
                </button>
                <h2 id="welcome-pack-title" className="font-display">
                  Claim your PKFX Welcome Pack
                </h2>
                <p className="welcome-pack-modal-sub">
                  One pack per member. Enter shipping details to claim.
                </p>

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
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      {openStatus && order
        ? createPortal(
            <div className="overlay welcome-pack-overlay" onClick={() => setOpenStatus(false)}>
              <div
                className="modal welcome-pack-modal animate-fade-up"
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-pack-status-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={() => setOpenStatus(false)}
                >
                  <X size={16} />
                </button>
                <h2 id="welcome-pack-status-title" className="font-display">
                  Welcome Pack status
                </h2>
                <p className={`welcome-pack-status-pill status-${order.status}`}>
                  {statusLabel(order.status)}
                </p>
                <dl className="welcome-pack-status-list">
                  <div>
                    <dt>Ship to</dt>
                    <dd>
                      {order.name}
                      <br />
                      {order.address}
                      <br />
                      {order.province}, {order.postalCode}
                    </dd>
                  </div>
                  <div>
                    <dt>Tee</dt>
                    <dd>
                      {order.shirtSize} · {order.shirtColor}
                    </dd>
                  </div>
                  <div>
                    <dt>Courier</dt>
                    <dd>{order.courier || 'Assigned soon'}</dd>
                  </div>
                  <div>
                    <dt>Tracking</dt>
                    <dd>{order.trackingNumber || 'Pending'}</dd>
                  </div>
                </dl>
                <button type="button" className="btn btn-primary" onClick={() => setOpenStatus(false)}>
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
