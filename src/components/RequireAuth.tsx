import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser, isAuthenticated, logout } from '../auth'

export function RequireAuth() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

/** Client app routes — admins go to Admin Portal; pending clients stay out until approved */
export function RequireClient() {
  const user = getCurrentUser()
  const location = useLocation()
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'admin' && !location.pathname.startsWith('/billing') && location.pathname !== '/logout') {
    return <Navigate to="/admin" replace />
  }
  if (user.role !== 'admin') {
    const status = user.status || 'pending'
    if (status === 'pending' || status === 'lead') {
      logout()
      return <Navigate to="/" replace state={{ pendingApproval: true }} />
    }
  }
  return <Outlet />
}

/** Admin portal routes — clients stay in the client app */
export function RequireAdmin() {
  const user = getCurrentUser()
  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
