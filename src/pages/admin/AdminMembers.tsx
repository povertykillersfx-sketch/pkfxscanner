import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { listMembers, revokeMemberAccess, type UserProfile } from '../../auth'
import './admin.css'

export function AdminMembers() {
  const [tick, setTick] = useState(0)
  const members = useMemo(() => listMembers(), [tick])

  function revoke(member: UserProfile) {
    revokeMemberAccess(member.email)
    setTick((n) => n + 1)
  }

  return (
    <div className="admin-page">
      <h1 className="admin-title">Members</h1>
      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>MT4/5</th>
                <th>Contact</th>
                <th>Country</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const status = m.status || 'lead'
                return (
                  <tr key={m.email}>
                    <td>
                      <span className={`admin-status ${status}`}>{status}</span>
                    </td>
                    <td>{m.fullName}</td>
                    <td>{m.mt4 || '—'}</td>
                    <td>
                      {m.email}
                      {m.phone ? `-${m.phone}` : ''}
                    </td>
                    <td>{m.country || '—'}</td>
                    <td>
                      {status === 'active' && (
                        <button type="button" className="admin-btn admin-btn-danger" onClick={() => revoke(m)}>
                          <X size={14} /> Revoke Access
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-legend">
          <p>
            <strong>Lead:</strong> Client just signed up but hasn&apos;t opened an account yet.
          </p>
          <p>
            <strong>Pending:</strong> Client submitted a request and is waiting for approval.
          </p>
          <p>
            <strong>Active:</strong> User has access to the platform.
          </p>
        </div>

        <div className="admin-empty" style={{ paddingTop: '1rem' }}>
          <p>You don&apos;t have any pending requests 🚀</p>
          <div className="admin-empty-art" aria-hidden>
            🚀
          </div>
        </div>
      </section>
    </div>
  )
}
