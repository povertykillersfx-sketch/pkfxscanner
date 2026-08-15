import { getCurrentUser } from '../auth'
import './ProfileModal.css'

interface ProfileModalProps {
  onClose: () => void
}

function formatJoinedDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function displayPlan(plan: string, role: string): string {
  if (role === 'admin') return 'Admin'
  if (plan === 'admin') return 'Admin'
  return 'Inner Circle'
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const user = getCurrentUser()
  if (!user) return null

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="modal modal-profile animate-fade-up animate-pulse-neon"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-name"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="profile-avatar-wrap">
          <img src={user.avatar} alt="" className="profile-avatar" />
        </div>

        <h2 id="profile-name" className="profile-name font-display">
          {user.fullName}
        </h2>

        <p className="profile-section-title">Basic Information</p>

        <div className="profile-fields">
          <div className="profile-field">
            <label>Email Address</label>
            <p>{user.email}</p>
          </div>
          <div className="profile-field">
            <label>Current Plan</label>
            <p>{displayPlan(user.plan, user.role)}</p>
          </div>
          <div className="profile-field">
            <label>Joined</label>
            <p>{formatJoinedDate(user.joinedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
