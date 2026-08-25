import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
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
      description="Your saved alerts and bookmarked lessons will appear here."
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
    <div className="cyber-bg signin-page">
      <div className="signin-scan" aria-hidden />
      <form className="signin-card panel panel-glow animate-fade-up" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>
        <h1 className="signin-title font-display">Reset Password</h1>
        <div className="signin-fields">
          <input
            className="field"
            type="text"
            inputMode="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
              setMessage('')
            }}
            autoComplete="username"
            required
          />
          <input
            className="field"
            type="password"
            placeholder="New password"
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
        </div>
        {error && <p className="signin-error">{error}</p>}
        {message && <p className="signin-hint">{message}</p>}
        <button type="submit" className="btn btn-primary signin-btn">
          Save new password
        </button>
        <p className="signin-signup">
          <Link to="/">Back to Sign In</Link>
        </p>
      </form>
    </div>
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
