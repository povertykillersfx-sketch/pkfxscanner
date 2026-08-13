import { Link, useLocation } from 'react-router-dom'
import { Check, GraduationCap, Radio, ScanSearch, Users } from 'lucide-react'
import { Logo } from '../components/Logo'
import { PAYMENT_URL, PLAN } from '../config/payments'
import './ChoosePlan.css'

const BENEFIT_ICONS = [ScanSearch, Users, Radio, GraduationCap] as const

export function ChoosePlan() {
  const location = useLocation()
  const firstName = (location.state as { firstName?: string } | null)?.firstName?.trim()

  function goToPayment() {
    if (!PAYMENT_URL) {
      window.alert('Payment link will be connected shortly. Please check back soon.')
      return
    }
    window.location.assign(PAYMENT_URL)
  }

  return (
    <div className="cyber-bg choose-plan-page">
      <div className="choose-plan-orb choose-plan-orb-a" aria-hidden />
      <div className="choose-plan-orb choose-plan-orb-b" aria-hidden />
      <div className="choose-plan-grid" aria-hidden />

      <main className="choose-plan-stage animate-fade-up">
        <div className="choose-plan-brand">
          <Logo size="lg" />
        </div>

        <header className="choose-plan-intro">
          <h1 className="font-display">
            Let&apos;s get you started{firstName ? `, ${firstName}` : ''}
          </h1>
          <p>Unlock the full PKFX trading system — one simple annual plan.</p>
        </header>

        <section className="choose-plan-offer" aria-label="Annual package">
          <div className="choose-plan-offer-top">
            <p className="choose-plan-kicker">{PLAN.name}</p>
            <div className="choose-plan-price">
              <span className="choose-plan-amount">{PLAN.priceLabel}</span>
              <span className="choose-plan-period">/{PLAN.period}</span>
            </div>
            <p className="choose-plan-price-note">Billed once a year. Cancel anytime before renewal.</p>
          </div>

          <h2 className="choose-plan-includes-title">Here is what you get inside</h2>
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
          <p className="choose-plan-secure">Secure checkout · Instant confirmation after payment</p>
        </section>

        <p className="choose-plan-foot">
          Already paid? <Link to="/">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
