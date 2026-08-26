import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Check, ExternalLink, Gift, X } from 'lucide-react'
import { getCommunitySettings } from '../adminStore'
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

type ClaimStep = 1 | 2 | 3

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

function getBrokerLink(): { title: string; url: string } {
  const brokers = getCommunitySettings().resources.filter(
    (r) => r.category === 'broker' && r.url.trim(),
  )
  const first = brokers[0]
  if (first) return { title: first.title.replace(/^Broker sign-up —\s*/i, '') || 'our broker', url: first.url }
  return { title: 'Exness', url: 'https://www.exness.com/' }
}

export function WelcomePackCard() {
  const user = getCurrentUser()
  const { order, notifs, refresh } = useWelcomePack()
  const [openForm, setOpenForm] = useState(false)
  const [openStatus, setOpenStatus] = useState(false)
  const [step, setStep] = useState<ClaimStep>(1)
  const [deposited, setDeposited] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const broker = useMemo(() => getBrokerLink(), [openForm])

  const [form, setForm] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    province: 'Gauteng',
    postalCode: '',
    shirtSize: 'L',
    shirtColor: 'Black' as string,
    mt5Account: '',
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

  function openClaim() {
    setStep(1)
    setDeposited(false)
    setError('')
    setOpenForm(true)
  }

  function goNextFromStep2() {
    setError('')
    if (!deposited) {
      setError('Confirm you’ve deposited first.')
      return
    }
    if (!form.mt5Account.trim()) {
      setError('Enter your MT5 account number to continue.')
      return
    }
    setStep(3)
  }

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
        <button type="button" className="welcome-pack-banner is-claimable" onClick={openClaim}>
          <span className="welcome-pack-banner-main">
            <span className="welcome-pack-banner-title-row">
              <Gift size={18} strokeWidth={2.25} aria-hidden />
              <span className="welcome-pack-banner-title">PKFX Welcome Pack — Claim Yours</span>
            </span>
            <span className="welcome-pack-banner-includes">
              Exclusive PKFX t-shirt · PKFX Branded Mug · PKFX Keychain
            </span>
          </span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden className="welcome-pack-banner-arrow" />
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
                  <Gift size={22} strokeWidth={2.25} aria-hidden />
                  Claim your Welcome Pack
                </h2>
                <p className="welcome-pack-modal-sub">Three quick steps. You’re almost there.</p>
                <ul className="welcome-pack-includes" aria-label="What’s in the pack">
                  <li>Exclusive PKFX t-shirt</li>
                  <li>PKFX Branded Mug</li>
                  <li>PKFX Keychain</li>
                </ul>

                <ol className="welcome-pack-progress" aria-label="Claim progress">
                  {[
                    { n: 1 as ClaimStep, label: 'Broker' },
                    { n: 2 as ClaimStep, label: 'Deposit' },
                    { n: 3 as ClaimStep, label: 'Claim' },
                  ].map(({ n, label }) => (
                    <li
                      key={n}
                      className={`welcome-pack-progress-item${step === n ? ' is-current' : ''}${
                        step > n ? ' is-done' : ''
                      }`}
                    >
                      <span className="welcome-pack-progress-num">
                        {step > n ? <Check size={14} strokeWidth={2.75} /> : n}
                      </span>
                      <span className="welcome-pack-progress-label">{label}</span>
                    </li>
                  ))}
                </ol>

                {step === 1 && (
                  <div className="welcome-pack-step-body">
                    <h3>Step 1 — Open a broker account</h3>
                    <p>Use our link so we can verify your account later.</p>
                    <a
                      className="btn btn-outline welcome-pack-broker-link"
                      href={broker.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {broker.title}
                      <ExternalLink size={15} />
                    </a>
                    <div className="welcome-pack-form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setOpenForm(false)}>
                        Later
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                        I’ve opened my account
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="welcome-pack-step-body">
                    <h3>Step 2 — Verify & deposit</h3>
                    <p>Fund the account when you’re ready. We’ll ask for your MT5 number next.</p>

                    <label className="welcome-pack-check">
                      <input
                        type="checkbox"
                        checked={deposited}
                        onChange={(e) => {
                          setDeposited(e.target.checked)
                          setError('')
                        }}
                      />
                      <span>I’ve deposited into my account</span>
                    </label>

                    {deposited && (
                      <label className="welcome-pack-mt5">
                        <span>MT5 account number</span>
                        <input
                          value={form.mt5Account}
                          onChange={(e) => setForm((f) => ({ ...f, mt5Account: e.target.value }))}
                          placeholder="e.g. 12345678"
                          inputMode="numeric"
                          autoComplete="off"
                          autoFocus
                        />
                      </label>
                    )}

                    {error ? <p className="welcome-pack-error">{error}</p> : null}

                    <div className="welcome-pack-form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                        Back
                      </button>
                      <button type="button" className="btn btn-primary" onClick={goNextFromStep2}>
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <form className="welcome-pack-step-body" onSubmit={(e) => void onSubmit(e)}>
                    <h3>Step 3 — Claim the pack</h3>
                    <p>Where should we send it?</p>

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

                    <p className="welcome-pack-mt5-note">MT5 · {form.mt5Account || '—'}</p>

                    {error ? <p className="welcome-pack-error">{error}</p> : null}

                    <div className="welcome-pack-form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                        Back
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Claim Welcome Pack'}
                      </button>
                    </div>
                  </form>
                )}
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
                    <dt>MT5</dt>
                    <dd>{order.mt5Account || '—'}</dd>
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
