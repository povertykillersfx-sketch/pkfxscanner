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

      <aside className="portal-brand">
        <div className="portal-brand-inner">
          <div className="portal-brand-logo motion-scale-in">
            <Logo size="lg" />
          </div>
          <p className="portal-eyebrow motion-rise motion-d1">{eyebrow}</p>
          <h1 className="portal-headline font-display motion-rise motion-d2">{headline}</h1>
          <p className="portal-subcopy motion-rise motion-d3">{subcopy}</p>
          <div className="portal-brand-rule motion-rule" aria-hidden />
          <p className="portal-brand-foot motion-rise motion-d5">Poverty Killers FX</p>
        </div>
      </aside>

      <section className="portal-stage">
        <div className="portal-stage-inner motion-rise-soft motion-d4">{children}</div>
      </section>
    </div>
  )
}
