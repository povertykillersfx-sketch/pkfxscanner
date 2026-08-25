import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PortalShell } from '../components/PortalShell'
import { logout, resetPassword } from '../auth'
import './Placeholder.css'
import './SignIn.css'

interface PlaceholderProps {
  title: string
  description: string
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="placeholder-page panel panel-glow animate-fade-up">
      <h2 className="font-display">{title}</h2>
      <p>{description}</p>
      <Link to="/dashboard" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  )
}

export function Favorites() {
  return (
    <Placeholder
      title="My Favorites"
      description="Your saved Trade Ideas and bookmarked lessons will appear here."
    />
  )
}

export function Billing() {
  return (
    <div className="placeholder-page panel panel-glow animate-fade-up">
      <h2 className="font-display">Billing</h2>
      <p>Manage your PKFX plan and payment.</p>
      <Link to="/choose-plan" className="btn btn-primary">
        View plan &amp; pay
      </Link>
    </div>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = resetPassword(email, password)
    if (!result.ok) {
      setError(result.error)
      setMessage('')
      return
    }
    setError('')
    setMessage('Password updated. You can sign in now.')
  }

  return (
    <PortalShell
      eyebrow="Account Recovery"
      headline="Reset access."
      subcopy="Set a new password and get back into your PKFX portal."
    >
      <form className="portal-panel" onSubmit={handleSubmit}>
        <h2 className="portal-panel-title font-display">Reset password</h2>
        <p className="portal-panel-lead">Enter your email and choose a new password.</p>

        <div className="portal-fields">
          <label className="portal-field">
            <span className="portal-label">Email</span>
            <input
              className="field"
              type="text"
              inputMode="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
                setMessage('')
              }}
              autoComplete="username"
              required
            />
          </label>
          <label className="portal-field">
            <span className="portal-label">New password</span>
            <input
              className="field"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
                setMessage('')
              }}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
        </div>

        {error && <p className="portal-error">{error}</p>}
        {message && <p className="portal-success">{message}</p>}

        <button type="submit" className="btn btn-primary">
          Save new password
        </button>

        <div className="portal-meta">
          <p>
            <Link to="/">Back to sign in</Link>
          </p>
        </div>
      </form>
    </PortalShell>
  )
}

export function Logout() {
  logout()
  return (
    <div className="cyber-bg placeholder-auth">
      <div className="panel panel-glow animate-fade-up placeholder-auth-card">
        <h2 className="font-display">Logged Out</h2>
        <p>You have been signed out of PKFX.</p>
        <Link to="/" className="btn btn-primary">
          Sign In again
        </Link>
      </div>
    </div>
  )
}
