import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { getSignupFunnelEmail, markPaymentStarted, setSignupFunnelEmail } from '../auth'
import { PAYMENT_URL, PLAN } from '../config/payments'
import './ChoosePlan.css'

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

      <main className="choose-plan-stage">
        <header className="choose-plan-intro">
          <div className="choose-plan-brand motion-scale-in">
            <Logo size="lg" />
          </div>
          <p className="choose-plan-eyebrow motion-rise motion-d1">Premium Access</p>
          <h1 className="font-display motion-rise motion-d2">
            Let&apos;s get you started{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="motion-rise motion-d3">
            Unlock the full PKFX trading system — one simple once-off package.
          </p>
        </header>

        <section className="choose-plan-offer motion-rise-soft motion-d4" aria-label="PKFX package">
          <div className="choose-plan-offer-top">
            <div className="choose-plan-offer-badge">Most selected</div>
            <p className="choose-plan-kicker">{PLAN.name}</p>
            <div className="choose-plan-price">
              <span className="choose-plan-amount">{PLAN.priceLabel}</span>
              <span className="choose-plan-period">{PLAN.periodLabel}</span>
            </div>
            <p className="choose-plan-usd">
              approx. <strong>{PLAN.usdPriceLabel}</strong> USD {PLAN.periodLabel}
            </p>
            <p className="choose-plan-price-note">Pay once. No monthly subscription.</p>
          </div>

          <h2 className="choose-plan-includes-title">{PLAN.benefitsIntro}</h2>
          <ul className="choose-plan-benefits">
            {PLAN.benefits.map((benefit, index) => (
              <li
                key={benefit}
                className={`choose-plan-benefit motion-rise motion-d${Math.min(index + 5, 7)}`}
              >
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="choose-plan-welcome">
            <p className="choose-plan-welcome-intro">{PLAN.welcomePackIntro}</p>
            <h3 className="choose-plan-welcome-title">{PLAN.welcomePackTitle}</h3>
            <ul className="choose-plan-welcome-list">
              {PLAN.welcomePackItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

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
