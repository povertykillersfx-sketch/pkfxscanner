import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { register } from '../auth'
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY, type CountryDialCode } from '../data/countryDialCodes'
import './SignIn.css'

export function SignUp() {
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<CountryDialCode>(DEFAULT_COUNTRY)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dialOpen, setDialOpen] = useState(false)
  const [dialQuery, setDialQuery] = useState('')
  const dialRef = useRef<HTMLDivElement>(null)

  const filteredCountries = useMemo(() => {
    const q = dialQuery.trim().toLowerCase()
    if (!q) return COUNTRY_DIAL_CODES
    return COUNTRY_DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.iso.toLowerCase().includes(q),
    )
  }, [dialQuery])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dialRef.current?.contains(e.target as Node)) {
        setDialOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    const result = register({
      firstName,
      surname,
      email,
      password,
      phone,
      country: country.name,
      dialCode: country.dial,
    })
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
        <div className="signin-card panel panel-glow animate-fade-up signup-card">
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
      <form className="signin-card panel panel-glow animate-fade-up signup-card" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <Logo size="lg" />
        </div>

        <h1 className="signin-title font-display">Sign Up</h1>
        <p className="signin-sub">Create an account — access opens after Super Admin approval.</p>

        <div className="signin-fields">
          <input
            className="field"
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setError('')
            }}
            autoComplete="given-name"
            required
          />
          <input
            className="field"
            type="text"
            placeholder="Surname"
            value={surname}
            onChange={(e) => {
              setSurname(e.target.value)
              setError('')
            }}
            autoComplete="family-name"
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
            autoComplete="email"
            required
          />

          <div className={`phone-field ${error.toLowerCase().includes('phone') ? 'has-error' : ''}`} ref={dialRef}>
            <button
              type="button"
              className="phone-dial-btn"
              aria-label="Choose country code"
              aria-expanded={dialOpen}
              onClick={() => setDialOpen((v) => !v)}
            >
              <span className="phone-flag">{country.flag}</span>
              <span className="phone-dial">{country.dial}</span>
              <ChevronDown size={14} />
            </button>
            <input
              className="field phone-input"
              type="tel"
              inputMode="tel"
              placeholder="71 123 4567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setError('')
              }}
              autoComplete="tel-national"
              required
            />
            {dialOpen && (
              <div className="phone-dial-menu" role="listbox">
                <input
                  className="field phone-dial-search"
                  type="search"
                  placeholder="Search"
                  value={dialQuery}
                  onChange={(e) => setDialQuery(e.target.value)}
                  autoFocus
                />
                <div className="phone-dial-list">
                  {filteredCountries.map((c) => (
                    <button
                      key={`${c.iso}-${c.dial}`}
                      type="button"
                      className={`phone-dial-option ${c.iso === country.iso && c.dial === country.dial ? 'active' : ''}`}
                      onClick={() => {
                        setCountry(c)
                        setDialOpen(false)
                        setDialQuery('')
                        setError('')
                      }}
                    >
                      <span className="phone-flag">{c.flag}</span>
                      <span className="phone-option-name">{c.name}</span>
                      <span className="phone-option-dial">{c.dial}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && <p className="phone-dial-empty">No countries found</p>}
                </div>
              </div>
            )}
          </div>

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
          <input
            className={`field ${confirmPassword && confirmPassword !== password ? 'field-error' : ''}`}
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setError('')
            }}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        {error && <p className="signin-error">{error}</p>}
        {!error && confirmPassword && confirmPassword !== password && (
          <p className="signin-error">Passwords do not match.</p>
        )}

        <button
          type="submit"
          className="btn btn-primary signin-btn"
          disabled={Boolean(confirmPassword && password !== confirmPassword)}
        >
          Sign Up
        </button>

        <p className="signin-signup">
          Already have an account? <Link to="/">Sign In</Link>
        </p>
      </form>
    </div>
  )
}
