import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import Layout from '@/components/Layout'
import MemberLayout from '@/components/MemberLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import MemberSchedule from '@/pages/member/Schedule'
import MemberRecords from '@/pages/member/Records'
import MemberPackages from '@/pages/member/Packages'
import MemberQRCode from '@/pages/member/QRCode'
import MemberExportRecords from '@/pages/member/ExportRecords'
import CoachClasses from '@/pages/coach/Classes'
import CoachCheckin from '@/pages/coach/Checkin'
import CoachAttendance from '@/pages/coach/Attendance'
import AdminClasses from '@/pages/admin/Classes'
import AdminCoaches from '@/pages/admin/Coaches'
import AdminStats from '@/pages/admin/Stats'
import AdminRules from '@/pages/admin/Rules'
import AdminReports from '@/pages/admin/Reports'
import type { UserRole } from '@/types'

function HomeRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const roleRoutes: Record<UserRole, string> = {
    member: '/member/schedule',
    coach: '/coach/classes',
    admin: '/admin/classes',
  }
  return <Navigate to={roleRoutes[user!.role]} replace />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route path="/member" element={<ProtectedRoute role="member"><MemberLayout /></ProtectedRoute>}>
          <Route path="schedule" element={<MemberSchedule />} />
          <Route path="bookings" element={<MemberRecords />} />
          <Route path="packages" element={<MemberPackages />} />
          <Route path="qrcode" element={<MemberQRCode />} />
          <Route path="export" element={<MemberExportRecords />} />
        </Route>

        <Route path="/coach" element={<ProtectedRoute role="coach"><Layout /></ProtectedRoute>}>
          <Route path="classes" element={<CoachClasses />} />
          <Route path="checkin/:classId" element={<CoachCheckin />} />
          <Route path="attendance/:classId" element={<CoachAttendance />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
          <Route path="classes" element={<AdminClasses />} />
          <Route path="coaches" element={<AdminCoaches />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="rules" element={<AdminRules />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
