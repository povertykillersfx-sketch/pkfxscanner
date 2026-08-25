import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, GraduationCap, Radio, ScanSearch, Users } from 'lucide-react'
import { Logo } from '../components/Logo'
import { getSignupFunnelEmail, markPaymentStarted, setSignupFunnelEmail } from '../auth'
import { PAYMENT_URL, PLAN } from '../config/payments'
import './ChoosePlan.css'

const BENEFIT_ICONS = [ScanSearch, Users, Radio, GraduationCap] as const
const WAITING_MESSAGE =
  'Your account is waiting for Admin approval. Please try again after you are approved.'

export function ChoosePlan() {
  const location = useLocation()
  const state = location.state as {
    firstName?: string
    email?: string
    fromLoginPending?: boolean
  } | null
  const firstName = state?.firstName?.trim()
  const email = (state?.email || getSignupFunnelEmail()).trim()
  const fromLoginPending = Boolean(state?.fromLoginPending)
  const [paidNotice, setPaidNotice] = useState('')

  useEffect(() => {
    if (state?.email) setSignupFunnelEmail(state.email)
  }, [state?.email])

  function goToPayment() {
    markPaymentStarted(email || undefined)

    if (!PAYMENT_URL) {
      window.alert('Payment link will be connected shortly. Please check back soon.')
      return
    }
    window.location.assign(PAYMENT_URL)
  }

  function onAlreadyPaid() {
    markPaymentStarted(email || undefined)
    setPaidNotice(WAITING_MESSAGE)
  }

  return (
    <div className="cyber-bg choose-plan-page">
      <div className="choose-plan-orb choose-plan-orb-a" aria-hidden />
      <div className="choose-plan-orb choose-plan-orb-b" aria-hidden />
      <div className="choose-plan-orb choose-plan-orb-c" aria-hidden />
      <div className="choose-plan-grid" aria-hidden />
      <div className="choose-plan-vignette" aria-hidden />

      <main className="choose-plan-stage animate-fade-up">
        <div className="choose-plan-brand">
          <Logo size="lg" />
        </div>

        <header className="choose-plan-intro">
          <p className="choose-plan-eyebrow">Premium Access</p>
          <h1 className="font-display">
            Let&apos;s get you started{firstName ? `, ${firstName}` : ''}
          </h1>
          <p>Unlock the full PKFX trading system — one simple annual plan.</p>
        </header>

        <section className="choose-plan-offer" aria-label="Annual package">
          <div className="choose-plan-offer-top">
            <div className="choose-plan-offer-badge">Most selected</div>
            <p className="choose-plan-kicker">{PLAN.name}</p>
            <div className="choose-plan-price">
              <span className="choose-plan-amount">{PLAN.priceLabel}</span>
              <span className="choose-plan-period">/{PLAN.period}</span>
            </div>
            <p className="choose-plan-usd">
              approx. <strong>{PLAN.usdPriceLabel}</strong> USD /{PLAN.period}
            </p>
            <p className="choose-plan-price-note">Billed once a year. Cancel anytime before renewal.</p>
          </div>

          <h2 className="choose-plan-includes-title">Included in your membership</h2>
          <ul className="choose-plan-benefits">
            {PLAN.benefits.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[index] ?? Check
              return (
                <li key={benefit} className={`choose-plan-benefit stagger-${index + 1}`}>
                  <span className="choose-plan-benefit-icon" aria-hidden>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span>{benefit}</span>
                </li>
              )
            })}
          </ul>

          <button type="button" className="btn btn-primary choose-plan-cta" onClick={goToPayment}>
            Continue to Payment
          </button>

          {fromLoginPending ? (
            <>
              <button type="button" className="btn choose-plan-paid-btn" onClick={onAlreadyPaid}>
                I&apos;ve already paid
              </button>
              {paidNotice ? <p className="choose-plan-paid-notice">{paidNotice}</p> : null}
            </>
          ) : (
            <p className="choose-plan-secure">Secure checkout · Instant confirmation after payment</p>
          )}
        </section>

        <p className="choose-plan-foot">
          {fromLoginPending ? (
            <>
              Back to <Link to="/">Sign in</Link>
            </>
          ) : (
            <>
              Already paid? <Link to="/">Sign in</Link>
            </>
          )}
        </p>
      </main>
    </div>
  )
}
