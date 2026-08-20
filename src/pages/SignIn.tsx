import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
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
    <div className="cyber-bg signin-page signin-page-fixed">
      <div className="signin-scan" aria-hidden />
      <form className="signin-card panel panel-glow animate-fade-up animate-pulse-neon" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>

        <h1 className="signin-title font-display">Sign In</h1>

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
