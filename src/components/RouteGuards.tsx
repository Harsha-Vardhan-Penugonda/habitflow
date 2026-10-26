import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasSeenWelcome } from '../lib/onboarding'
import { PageLoader } from './ui'

/** Only renders its child routes for logged-in users. */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!session) {
    // Remember where the user wanted to go, so we can send them back after login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/**
 * Welcome, login and signup pages: logged-in users are sent to the app
 * instead, and first-time visitors are asked "Are you new here?" first.
 */
export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />
  }
  if (!hasSeenWelcome() && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace state={location.state} />
  }
  return <Outlet />
}
