import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { register } from '../auth'
import './SignIn.css'

export function SignUp() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = register({ fullName, email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="cyber-bg signin-page">
        <div className="signin-scan" aria-hidden />
        <div className="signin-card panel panel-glow animate-fade-up">
          <div className="signin-logo">
            <Logo size="lg" />
          </div>
          <h1 className="signin-title font-display">Request sent</h1>
          <p className="signin-sub">
            Thanks for signing up. Your account is pending Super Admin approval. You will be able to sign in once
            approved.
          </p>
          <Link to="/" className="btn btn-primary signin-btn">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-bg signin-page">
      <div className="signin-scan" aria-hidden />
      <form className="signin-card panel panel-glow animate-fade-up" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>

        <h1 className="signin-title font-display">Sign Up</h1>
        <p className="signin-sub">Create an account — access opens after Super Admin approval.</p>

        <div className="signin-fields">
          <input
            className="field"
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setError('')
            }}
            autoComplete="name"
            required
          />
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
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        {error && <p className="signin-error">{error}</p>}

        <button type="submit" className="btn btn-primary signin-btn">
          Request Access
        </button>

        <p className="signin-signup">
          Already have an account? <Link to="/">Sign In</Link>
        </p>
      </form>
    </div>
  )
}
