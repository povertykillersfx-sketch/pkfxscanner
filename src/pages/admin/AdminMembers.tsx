import { useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import {
  approveMember,
  listMembers,
  removeMember,
  revokeMemberAccess,
  type UserProfile,
} from '../../auth'
import './admin.css'

export function AdminMembers() {
  const [members, setMembers] = useState(() => listMembers())

  useEffect(() => {
    function refresh() {
      setMembers(listMembers())
    }
    window.addEventListener('pkfx-users-change', refresh)
    window.addEventListener('storage', refresh)
    const id = window.setInterval(refresh, 2000)
    return () => {
      window.removeEventListener('pkfx-users-change', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(id)
    }
  }, [])

  function revoke(member: UserProfile) {
    revokeMemberAccess(member.email)
    setMembers(listMembers())
  }

  function approve(member: UserProfile) {
    approveMember(member.email)
    setMembers(listMembers())
  }

  function remove(member: UserProfile) {
    if (!window.confirm(`Delete ${member.email}? They can sign up again afterwards.`)) return
    removeMember(member.email)
    setMembers(listMembers())
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
                      <td className="admin-member-actions">
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
                        <button type="button" className="admin-btn ghost" onClick={() => remove(m)}>
                          <Trash2 size={14} /> Delete
                        </button>
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
          <p>
            <strong>Delete:</strong> Removes the account so they can sign up again.
          </p>
        </div>
      </section>
    </div>
  )
}
