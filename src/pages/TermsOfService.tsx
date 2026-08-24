import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import './LegalPage.css'

export function TermsOfService() {
  return (
    <div className="legal-page">
      <header className="legal-topbar">
        <Link to="/" className="legal-brand" aria-label="PKFX home">
          <Logo size="sm" />
          <span className="legal-brand-name font-display">PKFX</span>
        </Link>
        <nav className="legal-top-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/signup">Sign Up</Link>
        </nav>
      </header>

      <main className="legal-doc animate-fade-up">
        <h1 className="font-display">TERMS OF SERVICE</h1>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the websites,
          applications, and services operated by <strong>Poverty Killers FX PTY LTD</strong>{' '}
          (&quot;PKFX&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) at{' '}
          <strong>povertykillersfx.com</strong> and related platforms.
        </p>
        <p>
          By creating an account or using our services, you agree to these Terms and our{' '}
          <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Site.
        </p>

        <h2>Services</h2>
        <p>
          PKFX provides educational trading content, community access, AI-assisted market alerts, and
          related tools. Our materials are for educational and informational purposes only and do not
          constitute financial, investment, or trading advice.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your login details secure and for activity under your
          account. You must provide accurate registration information and notify us of unauthorized
          use at{' '}
          <a href="mailto:support@povertykillersfx.com">support@povertykillersfx.com</a>.
        </p>

        <h2>Risk disclosure</h2>
        <p>
          Trading foreign exchange and related markets involves substantial risk of loss and may not
          be suitable for all investors. Past performance does not guarantee future results. You are
          solely responsible for your trading decisions.
        </p>

        <h2>Membership and payments</h2>
        <p>
          Paid plans grant access for the purchased period while your account remains in good
          standing. Fees, renewals, and refunds (if any) are described at checkout or in your plan
          communications.
        </p>

        <h2>Acceptable use</h2>
        <p>
          You may not misuse the Site, attempt unauthorized access, share membership credentials in
          violation of your plan, scrape or resell our content without permission, or harass other
          members in community channels.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:support@povertykillersfx.com">support@povertykillersfx.com</a>
        </p>

        <p className="legal-meta">
          Poverty Killers FX PTY LTD · povertykillersfx.com · Last updated{' '}
          {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
      </main>

      <footer className="legal-footer">
        <Link to="/signup">Back to Sign Up</Link>
        <span aria-hidden>·</span>
        <Link to="/privacy">Privacy Policy</Link>
      </footer>
    </div>
  )
}
