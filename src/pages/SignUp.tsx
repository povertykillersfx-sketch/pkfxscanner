import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PortalShell } from '../components/PortalShell'
import { capitalizeName, register } from '../auth'
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY, type CountryDialCode } from '../data/countryDialCodes'
import './SignIn.css'

export function SignUp() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState<CountryDialCode>(DEFAULT_COUNTRY)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
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
    navigate('/choose-plan', {
      replace: true,
      state: { firstName: capitalizeName(firstName.trim()), email: email.trim() },
    })
  }

  return (
    <PortalShell
      compactBrand
      eyebrow="Join PKFX"
      headline="Build your edge."
      subcopy="Create your account, choose a plan, and unlock the full trading system."
    >
      <form className="portal-panel signup-card" onSubmit={handleSubmit}>
        <h2 className="portal-panel-title font-display">Create account</h2>
        <p className="portal-panel-lead">A few details to get you into the portal.</p>

        <div className="portal-fields">
          <div className="portal-name-row">
            <label className="portal-field">
              <span className="portal-label">First name</span>
              <input
                className="field"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(capitalizeName(e.target.value))
                  setError('')
                }}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="portal-field">
              <span className="portal-label">Surname</span>
              <input
                className="field"
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={(e) => {
                  setSurname(capitalizeName(e.target.value))
                  setError('')
                }}
                autoComplete="family-name"
                required
              />
            </label>
          </div>

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
              autoComplete="email"
              required
            />
          </label>

          <div className="portal-field">
            <span className="portal-label">Phone</span>
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
          </div>

          <label className="portal-field">
            <span className="portal-label">Password</span>
            <input
              className="field"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="portal-field">
            <span className="portal-label">Confirm password</span>
            <input
              className={`field ${confirmPassword && confirmPassword !== password ? 'field-error' : ''}`}
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
        </div>

        {error && <p className="portal-error">{error}</p>}
        {!error && confirmPassword && confirmPassword !== password && (
          <p className="portal-error">Passwords do not match.</p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={Boolean(confirmPassword && password !== confirmPassword)}
        >
          Continue
        </button>

        <p className="portal-legal">
          By creating an account you agree to our{' '}
          <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>

        <div className="portal-meta">
          <p>
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
      </form>
    </PortalShell>
  )
}
