import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <div className="auth-page"><p>Loading session…</p></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
