import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Search, Trash2, X } from 'lucide-react'
import {
  approveMember,
  listMembers,
  removeMember,
  revokeMemberAccess,
  type UserProfile,
} from '../../auth'
import { filterClients } from '../../adminSearch'
import './admin.css'

function memberSurname(m: UserProfile): string {
  if (m.surname?.trim()) return m.surname.trim()
  const parts = (m.fullName || '').trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : '—'
}

export function AdminMembers() {
  const [members, setMembers] = useState(() => listMembers())
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')

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

  const visible = useMemo(() => filterClients(members, appliedQuery), [members, appliedQuery])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setAppliedQuery(query.trim())
  }

  function clearSearch() {
    setQuery('')
    setAppliedQuery('')
  }

  function revoke(member: UserProfile) {
    if (!window.confirm(`Revoke access for ${member.fullName || member.email}? They will be locked out until you approve them again.`)) {
      return
    }
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
        <div className="admin-card-head">
          <h2>Client members</h2>
          <span className="admin-muted">
            {appliedQuery ? `${visible.length} match` : `${members.length} total`}
          </span>
        </div>

        <form className="admin-search" onSubmit={onSearch}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, surname, email, or phone"
            aria-label="Search members"
          />
          <button type="submit" className="admin-btn">
            <Search size={15} /> Search
          </button>
          {appliedQuery && (
            <button type="button" className="admin-btn ghost" onClick={clearSearch}>
              Clear
            </button>
          )}
        </form>

        {members.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-art" aria-hidden>
              👥
            </div>
            <p>No members yet</p>
            <p className="admin-muted">
              When clients complete Sign Up, their details appear here automatically for you to approve, revoke, or
              delete.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="admin-empty">
            <p>No clients match “{appliedQuery}”</p>
            <p className="admin-muted">Try a different name, surname, email, or phone number.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>First name</th>
                  <th>Surname</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Country</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => {
                  const status = m.status || 'pending'
                  const canApprove = status === 'pending' || status === 'lead' || status === 'revoked'
                  const canRevoke = status === 'active'
                  return (
                    <tr key={m.email}>
                      <td>
                        <span className={`admin-status ${status}`}>{status}</span>
                      </td>
                      <td>{m.firstName || '—'}</td>
                      <td>{memberSurname(m)}</td>
                      <td>
                        <a className="admin-link" href={`mailto:${m.email}`}>
                          {m.email}
                        </a>
                      </td>
                      <td>{m.phone || '—'}</td>
                      <td>{m.country || '—'}</td>
                      <td className="admin-muted">
                        {m.joinedAt ? new Date(m.joinedAt).toLocaleString() : '—'}
                      </td>
                      <td className="admin-member-actions">
                        {canApprove && (
                          <button type="button" className="admin-btn" onClick={() => approve(m)}>
                            <Check size={14} /> Approve
                          </button>
                        )}
                        {canRevoke && (
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
            <strong>Pending / Lead:</strong> Registered and waiting for approval (also listed under Requests).
          </p>
          <p>
            <strong>Active:</strong> Approved / paid — can use the client portal. Use <strong>Revoke Access</strong> to
            lock them out.
          </p>
          <p>
            <strong>Revoked:</strong> Access cut. They cannot sign in until you Approve again.
          </p>
          <p>
            <strong>Delete:</strong> Removes the account so they can sign up again.
          </p>
        </div>
      </section>
    </div>
  )
}
