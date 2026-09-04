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
  /** Show the Poverty Killers FX foot line under the rule. */
  showFoot?: boolean
}

export function PortalShell({
  children,
  locked = false,
  compactBrand = false,
  eyebrow = 'Member Portal',
  headline = 'Trade with precision.',
  subcopy,
  showFoot = true,
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
          <div className="portal-brand-lockup motion-scale-in">
            <div className="portal-brand-logo">
              <Logo size="lg" />
            </div>
            <p className="portal-eyebrow">{eyebrow}</p>
          </div>
          <h1 className="portal-headline font-display motion-rise motion-d2">{headline}</h1>
          {subcopy ? <p className="portal-subcopy motion-rise motion-d3">{subcopy}</p> : null}
          {showFoot ? (
            <>
              <div className="portal-brand-rule motion-rule" aria-hidden />
              <p className="portal-brand-foot motion-rise motion-d5">Poverty Killers FX</p>
            </>
          ) : null}
        </div>
      </aside>

      <section className="portal-stage">
        <div className="portal-stage-inner motion-rise-soft motion-d4">{children}</div>
      </section>
    </div>
  )
}
