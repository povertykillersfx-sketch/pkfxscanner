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
        <h1 className="font-display">Terms of Service for Poverty Killers FX</h1>
        <p className="legal-updated">Last Updated: August 24, 2026</p>

        <p>
          Welcome to Poverty Killers FX (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use
          of our website, subscription tiers, live trading streams, AI-powered tools, and any related
          products, content, or services provided by Poverty Killers FX (collectively, the
          &quot;Service&quot;).
        </p>
        <p>
          By accessing or using the Service, you agree to be bound by these Terms. If you do not
          agree to all of these Terms, you do not have permission to access or use the Service.
        </p>

        <h2>1. Description of Services</h2>
        <p>
          Poverty Killers FX is an online educational and market analysis ecosystem tailored for
          traders. Our services include, but are not limited to:
        </p>
        <ul>
          <li>
            <strong>Live Trading Streams:</strong> Real-time educational streaming sessions (such as
            our weekly live streams hosted every Wednesday) where market analysis and trading
            strategies are demonstrated.
          </li>
          <li>
            <strong>AI Trading Assistant:</strong> Subscription-based tools providing AI-powered
            alerts and assistance designed to help users identify potential market setups and
            opportunities.
          </li>
          <li>
            <strong>Educational Resources:</strong> Content designed to help members understand
            market mechanics, technical analysis, and trading psychology.
          </li>
        </ul>

        <h2>2. Financial Disclaimer &amp; Risk Warning</h2>
        <p>
          <strong>Not Financial Advice:</strong> The information, content, and services provided by
          Poverty Killers FX are for educational and informational purposes only. Nothing provided
          through our Service constitutes professional financial, investment, legal, or tax advice.
          We are not registered financial advisors, brokers, or broker-dealers.
        </p>
        <p>
          <strong>High Trading Risk:</strong> Trading foreign exchange (Forex), cryptocurrencies,
          and other financial instruments carries a high level of risk and may not be suitable for
          all investors. The high degree of leverage can work against you as well as for you. Before
          deciding to trade, you should carefully consider your investment objectives, level of
          experience, and risk appetite.
        </p>
        <p>
          <strong>No Guarantee of Results:</strong> Past performance is not indicative of future
          results. You acknowledge and agree that Poverty Killers FX is not responsible for any
          financial losses incurred by you as a result of using our educational content, live
          streams, AI alerts, market insights, or tools. You alone are fully responsible for your
          own trading decisions and financial outcomes.
        </p>

        <h2>3. Refunds and Cancellations Policy</h2>
        <p>
          <strong>No Refund Policy:</strong> Poverty Killers FX has a strict no-refund policy after
          sign-up. All payments and subscription fees made are final and non-refundable under any
          circumstances, including partial utilization of a billing period.
        </p>
        <p>
          <strong>Subscription Cancellations:</strong> You may cancel your subscription at any time
          through your account settings or by contacting our support team. However, Poverty Killers
          FX is not responsible for continued subscriptions should a customer forget to cancel their
          account. It is the customer&apos;s sole responsibility to confirm that their cancellation
          has been successfully completed before the next billing cycle.
        </p>

        <h2>4. User Accounts &amp; Registration</h2>
        <p>
          <strong>Account Security:</strong> To access features like the AI Trading Assistant or live
          streams, you may be required to create an account. You are responsible for safeguarding
          your password and account credentials.
        </p>
        <p>
          <strong>Accurate Information:</strong> You agree to provide accurate and current
          registration details and to update them as necessary.
        </p>
        <p>
          <strong>Account Termination:</strong> We reserve the right to suspend or terminate your
          account at any time for any reason, including violation of these Terms.
        </p>

        <h2>5. Acceptable Use Policy</h2>
        <p>When using Poverty Killers FX, you agree not to:</p>
        <ul>
          <li>Violate any applicable local, national, or international laws or regulations.</li>
          <li>
            Share, resell, or distribute your account access, AI-powered alerts, or paid materials
            with non-subscribers.
          </li>
          <li>Infringe upon our intellectual property rights or the rights of others.</li>
          <li>
            Upload or transmit malicious code, viruses, or spam within community chats or platforms.
          </li>
          <li>
            Impersonate any person or entity or falsify your affiliation with Poverty Killers FX.
          </li>
        </ul>

        <h2>6. Intellectual Property Rights</h2>
        <p>
          The Service and its entire contents, features, and functionality (including all software,
          AI tools, text, branding, graphics, videos, and audio streams) are owned by Poverty Killers
          FX and are protected by international copyright, trademark, and other intellectual property
          laws. You may not copy, modify, distribute, or create derivative works of any material
          without our explicit prior written consent.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Poverty Killers FX and its founders, employees, and
          affiliates shall not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits, revenues, or capital, whether incurred directly
          or indirectly, resulting from your use of the Service or reliance on any information
          provided herein.
        </p>

        <h2>8. Governing Law</h2>
        <p>
          These Terms shall be governed and construed in accordance with the laws of your primary
          operating jurisdiction, without regard to its conflict of law provisions.
        </p>

        <h2>9. Contact Information</h2>
        <p>If you have any questions about these Terms, please contact us at:</p>
        <p>
          Support Email:{' '}
          <a href="mailto:support@povertykillersfx.com">support@povertykillersfx.com</a>
        </p>

        <p className="legal-meta">
          Poverty Killers FX · povertykillersfx.com · Last updated August 24, 2026
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
