import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import './SignIn.css'

export function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="cyber-bg signin-page">
      <div className="signin-scan" aria-hidden />
      <form className="signin-card panel panel-glow animate-fade-up animate-pulse-neon" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>

        <h1 className="signin-title font-display">Sign In</h1>

        <div className="signin-fields">
          <input
            className="field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

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
