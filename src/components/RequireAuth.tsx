import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser, isAuthenticated } from '../auth'

export function RequireAuth() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

/** Client app routes — admins are sent to the Admin Portal */
export function RequireClient() {
  const user = getCurrentUser()
  const location = useLocation()
  if (!user) return <Navigate to="/" replace />
  if (user.role === 'admin' && !location.pathname.startsWith('/billing') && location.pathname !== '/logout') {
    return <Navigate to="/admin" replace />
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
