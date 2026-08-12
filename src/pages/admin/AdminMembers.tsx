import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { approveMember, listMembers, revokeMemberAccess, type UserProfile } from '../../auth'
import './admin.css'

export function AdminMembers() {
  const [tick, setTick] = useState(0)
  const members = useMemo(() => listMembers(), [tick])

  function revoke(member: UserProfile) {
    revokeMemberAccess(member.email)
    setTick((n) => n + 1)
  }

  function approve(member: UserProfile) {
    approveMember(member.email)
    setTick((n) => n + 1)
  }

  return (
    <div className="admin-page">
      <h1 className="admin-title">Members</h1>
      <section className="admin-card">
        {members.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-art" aria-hidden>
              👥
            </div>
            <p>No members yet</p>
            <p className="admin-muted">
              When clients sign up they appear as pending requests. Approve them to make them active.
            </p>
          </div>
        ) : (
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
                  const status = m.status || 'pending'
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
                        {(status === 'pending' || status === 'lead') && (
                          <button type="button" className="admin-btn" onClick={() => approve(m)}>
                            <Check size={14} /> Approve
                          </button>
                        )}
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
        )}

        <div className="admin-legend">
          <p>
            <strong>Pending / Lead:</strong> Registered and waiting for approval (counts under Requests).
          </p>
          <p>
            <strong>Active:</strong> Approved / paid subscription (counts under Active Users).
          </p>
        </div>
      </section>
    </div>
  )
}
