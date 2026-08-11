import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { register } from '../auth'
import './SignIn.css'

export function SignUp() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = register({ fullName, email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    navigate('/dashboard')
  }

  return (
    <div className="cyber-bg signin-page">
      <div className="signin-scan" aria-hidden />
      <form className="signin-card panel panel-glow animate-fade-up" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>

        <h1 className="signin-title font-display">Sign Up</h1>

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
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            autoComplete="email"
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
          Create Account
        </button>

        <p className="signin-signup">
          Already have an account? <Link to="/">Sign In</Link>
        </p>
      </form>
    </div>
  )
}
