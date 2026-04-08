import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Redirects anonymous users to login; optional role list for UI-level gating.
 */
export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles?.length) {
    const ok = roles.some((r) => user.roles?.includes(r))
    if (!ok) {
      return <Navigate to="/app" replace />
    }
  }

  return children
}
