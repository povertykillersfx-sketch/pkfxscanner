import { USER } from '../data/mockData'
import './ProfileModal.css'

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
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
          <img src={USER.avatar} alt="" className="profile-avatar" />
        </div>

        <h2 id="profile-name" className="profile-name font-display">
          {USER.fullName}
        </h2>

        <p className="profile-section-title">Basic Information</p>

        <div className="profile-fields">
          <div className="profile-field">
            <label>Email Address</label>
            <p>{USER.email}</p>
          </div>
          <div className="profile-field">
            <label>Current Plan</label>
            <p>{USER.plan}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
