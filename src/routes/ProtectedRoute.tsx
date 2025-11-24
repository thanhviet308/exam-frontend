import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  allowed?: UserRole[]
}

const ProtectedRoute = ({ allowed }: ProtectedRouteProps) => {
  const { isAuthenticated, role, loading } = useAuthContext()

  if (loading) {
    return <div className="centered">Đang tải...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowed && role && !allowed.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

