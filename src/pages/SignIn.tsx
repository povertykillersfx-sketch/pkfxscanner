import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { getCurrentUser, login } from '../auth'
import './SignIn.css'

export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const existing = getCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    (location.state as { pendingApproval?: boolean } | null)?.pendingApproval
      ? 'Your account is still waiting for Super Admin approval.'
      : '',
  )

  if (existing) {
    const status = existing.status || (existing.role === 'admin' ? 'active' : 'pending')
    if (existing.role === 'admin' || status === 'active') {
      return <Navigate to={existing.role === 'admin' ? '/admin' : '/dashboard'} replace />
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    navigate(result.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div className="cyber-bg signin-page">
      <div className="signin-scan" aria-hidden />
      <form className="signin-card panel panel-glow animate-fade-up animate-pulse-neon" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>

        <h1 className="signin-title font-display">Sign In</h1>
        <p className="signin-sub">One login for everyone — your account opens the matching dashboard.</p>

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
            }}
            autoComplete="username"
            required
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="signin-error">{error}</p>}

        <button type="submit" className="btn btn-primary signin-btn">
          Login
        </button>

        <p className="signin-hint">
          Same page for clients and Super Admin.
          <br />
          New signups wait for approval before access.
          <br />
          Client view: povertykillersfx@gmail.com / pkfx-client
          <br />
          Admin view: povertykillersfx2@gmail.com / pkfx-admin
        </p>

        <p className="signin-signup">
          Don&apos;t have an account? <Link to="/signup">Sign Up now</Link>
        </p>
        <Link to="/forgot" className="signin-forgot">
          Forgot password?
        </Link>
      </form>
    </div>
  )
}
