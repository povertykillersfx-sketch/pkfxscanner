import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PortalShell } from '../components/PortalShell'
import { getCurrentUser, login, setSignupFunnelEmail } from '../auth'
import { playLoginSuccessSound } from '../sounds'
import './SignIn.css'

export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const existing = getCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    const state = location.state as { pendingApproval?: boolean; revoked?: boolean } | null
    if (state?.revoked) return 'Your access was revoked by Admin.'
    if (state?.pendingApproval) return 'Your account is still waiting for Admin approval.'
    return ''
  })

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('signin-lock')
    body.classList.add('signin-lock')
    return () => {
      html.classList.remove('signin-lock')
      body.classList.remove('signin-lock')
    }
  }, [])

  if (existing) {
    if (existing.role === 'admin' || (existing.status || 'pending') === 'active') {
      return <Navigate to={existing.role === 'admin' ? '/admin' : '/dashboard'} replace />
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      if (result.reason === 'awaiting_approval') {
        setSignupFunnelEmail(result.email || email)
        navigate('/choose-plan', {
          replace: true,
          state: {
            firstName: result.firstName || '',
            email: result.email || email,
            fromLoginPending: true,
          },
        })
        return
      }
      setError(result.error)
      return
    }
    setError('')
    playLoginSuccessSound()
    navigate(result.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <PortalShell
      locked
      eyebrow="Member Portal"
      headline="Trade with precision."
      showFoot={false}
    >
      <form className="portal-panel" onSubmit={handleSubmit}>
        <h2 className="portal-panel-title font-display">Welcome back</h2>
        <p className="portal-panel-lead">Sign in to access your PKFX portal.</p>

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
              }}
              autoComplete="username"
              required
            />
          </label>
          <label className="portal-field">
            <span className="portal-label">Password</span>
            <input
              className="field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoComplete="current-password"
              required
            />
          </label>
        </div>

        {error && <p className="portal-error">{error}</p>}

        <button type="submit" className="btn btn-primary">
          Sign In
        </button>

        <div className="portal-meta">
          <p>
            Don&apos;t have an account? <Link to="/signup">Create account</Link>
          </p>
          <Link to="/forgot" className="portal-forgot">
            Forgot password?
          </Link>
        </div>
      </form>
    </PortalShell>
  )
}
