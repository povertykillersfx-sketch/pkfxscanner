import type { ReactNode } from 'react'
import { Logo } from './Logo'
import './PortalShell.css'

interface PortalShellProps {
  children: ReactNode
  /** Keep the viewport locked (sign-in). */
  locked?: boolean
  /** Compact brand column for tall forms (sign-up). */
  compactBrand?: boolean
  eyebrow?: string
  headline?: string
  subcopy?: string
}

export function PortalShell({
  children,
  locked = false,
  compactBrand = false,
  eyebrow = 'Member Portal',
  headline = 'Trade with precision.',
  subcopy = 'AI-powered alerts, sessions, and education — built for serious FX traders.',
}: PortalShellProps) {
  return (
    <div
      className={`portal-shell cyber-bg ${locked ? 'portal-shell-locked' : ''} ${compactBrand ? 'portal-shell-compact' : ''}`}
    >
      <div className="portal-atmosphere" aria-hidden>
        <span className="portal-orb portal-orb-a" />
        <span className="portal-orb portal-orb-b" />
        <span className="portal-orb portal-orb-c" />
        <span className="portal-grid" />
        <span className="portal-scan" />
        <span className="portal-vignette" />
      </div>

      <aside className="portal-brand animate-fade-up">
        <div className="portal-brand-inner">
          <div className="portal-brand-logo">
            <Logo size="lg" />
          </div>
          <p className="portal-eyebrow">{eyebrow}</p>
          <h1 className="portal-headline font-display">{headline}</h1>
          <p className="portal-subcopy">{subcopy}</p>
          <div className="portal-brand-rule" aria-hidden />
          <p className="portal-brand-foot">Poverty Killers FX</p>
        </div>
      </aside>

      <section className="portal-stage">
        <div className="portal-stage-inner animate-fade-up stagger-2">{children}</div>
      </section>
    </div>
  )
}
