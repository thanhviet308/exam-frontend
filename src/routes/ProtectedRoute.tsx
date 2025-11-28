import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, initialized } = useAuthContext()

  // Đợi AuthContext đọc xong dữ liệu từ localStorage rồi mới quyết định redirect
  if (!initialized) {
    return null
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

