import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import './LegalPage.css'

export function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <header className="legal-topbar">
        <Link to="/" className="legal-brand" aria-label="PKFX home">
          <Logo size="sm" />
          <span className="legal-brand-name font-display">PKFX</span>
        </Link>
        <nav className="legal-top-links">
          <Link to="/signup">Sign Up</Link>
          <Link to="/">Sign In</Link>
        </nav>
      </header>

      <main className="legal-doc animate-fade-up">
        <h1 className="font-display">PRIVACY POLICY</h1>

        <p>
          This privacy notice discloses the privacy practices for{' '}
          <strong>Poverty Killers FX PTY LTD</strong> (&quot;PKFX&quot;, &quot;we&quot;, &quot;us&quot;,
          or &quot;our&quot;), which operates <strong>povertykillersfx.com</strong> and related
          applications (the &quot;Site&quot;). This privacy notice applies solely to information
          collected by this website and our member platform. It will notify you of the following:
        </p>

        <ol>
          <li>
            What personally identifiable information is collected from you through the Site, how it
            is used, and with whom it may be shared.
          </li>
          <li>
            What choices are available to you regarding the use of your data.
          </li>
          <li>
            The security procedures in place to protect the misuse of your information.
          </li>
          <li>How you can correct any inaccuracies in the information.</li>
        </ol>

        <h2>Information Collection, Use, and Sharing</h2>
        <p>
          We are the sole owners of the information collected on this Site. We only have access to
          and collect information that you voluntarily give us via registration, account settings,
          payment flow, email, or other direct contact from you. We will not sell or rent this
          information to anyone.
        </p>
        <p>
          We will use your information to provide the services you request, including AI trading
          alerts, educational content, community access, live sessions, and account support. We will
          not share your information with any third party outside of our organization, other than as
          necessary to fulfil your request (for example, payment processing or hosting providers that
          help us operate the Site).
        </p>
        <p>
          Unless you ask us not to, we may contact you via email about updates, community notices,
          educational content, or special offers. You may opt out of these communications at any
          time.
        </p>
        <p>
          We may use third-party analytics and technical services that collect limited technical data
          (such as IP address, browser type, device information, and usage statistics) and may place
          cookies for statistical and operational purposes. This helps us understand how the Site is
          used and improve performance and security.
        </p>

        <h2>Your Access to and Control Over Information</h2>
        <p>
          You may opt out of any future contacts from us at any time. You can contact us at{' '}
          <a href="mailto:support@povertykillersfx.com">support@povertykillersfx.com</a> to:
        </p>
        <ul>
          <li>See what data we have about you, if any.</li>
          <li>Change or correct any data we have about you.</li>
          <li>Have us delete any data we have about you (subject to legal or operational needs).</li>
          <li>Express any concern you have about our use of your data.</li>
        </ul>

        <h2>Security</h2>
        <p>
          We take precautions to protect your information. When you submit sensitive information via
          the Site, we take steps to keep it protected both online and offline. Transmission of
          sensitive account or trading-related information is handled using secure methods where
          available. Access to personal information is limited to team members and service providers
          who need it to perform their duties.
        </p>
        <p>
          If you feel that we are not abiding by this privacy policy, please contact us immediately
          at <a href="mailto:support@povertykillersfx.com">support@povertykillersfx.com</a>.
        </p>

        <h2>Updates</h2>
        <p>
          We may update this Privacy Policy from time to time. Continued use of the Site after
          changes are posted means you accept the revised policy. The latest version will always be
          available on this page.
        </p>

        <p className="legal-meta">
          Poverty Killers FX PTY LTD · povertykillersfx.com · Last updated{' '}
          {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
      </main>

      <footer className="legal-footer">
        <Link to="/signup">Back to Sign Up</Link>
        <span aria-hidden>·</span>
        <Link to="/">Sign In</Link>
      </footer>
    </div>
  )
}
