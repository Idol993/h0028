import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  role: UserRole
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-carbon-dark">
        <div className="text-center">
          <p className="text-danger text-xl font-medium">无权限</p>
          <p className="text-gray-500 mt-2 text-sm">您没有访问此页面的权限</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
