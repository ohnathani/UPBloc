import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth.hook'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading, authError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="status-message">Checking your session...</p>
  }

  if (authError) {
    return (
      <p className="form-error">Unable to check authentication: {authError}</p>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
