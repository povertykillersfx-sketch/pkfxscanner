import { Link } from 'react-router-dom'
import { logout } from '../auth'
import './Placeholder.css'

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

export function Community() {
  return (
    <Placeholder
      title="Community"
      description="Connect with PKFX traders. Forums and live rooms coming online soon."
    />
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
    <Placeholder
      title="Billing"
      description="Manage your plan and payment methods. Current plan: free."
    />
  )
}

export function More() {
  return (
    <Placeholder
      title="More"
      description="Additional tools, settings, and resources for the PKFX scanner."
    />
  )
}

export function ForgotPassword() {
  return (
    <div className="cyber-bg placeholder-auth">
      <div className="panel panel-glow animate-fade-up placeholder-auth-card">
        <h2 className="font-display">Forgot Password</h2>
        <p>Password reset flow coming soon.</p>
        <Link to="/" className="btn btn-primary">
          Back to Sign In
        </Link>
      </div>
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
