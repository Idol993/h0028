import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { UserRole } from '@/types'
import {
  Calendar,
  ClipboardList,
  Package,
  QrCode,
  ScanLine,
  UserCheck,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  FileDown,
  LogOut,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  member: [
    { label: '课表', icon: <Calendar size={20} />, path: '/member/schedule' },
    { label: '我的预约', icon: <ClipboardList size={20} />, path: '/member/bookings' },
    { label: '课时包', icon: <Package size={20} />, path: '/member/packages' },
    { label: '签到码', icon: <QrCode size={20} />, path: '/member/qrcode' },
  ],
  coach: [
    { label: '我的课程', icon: <Calendar size={20} />, path: '/coach/classes' },
    { label: '扫码核销', icon: <ScanLine size={20} />, path: '/coach/scan' },
    { label: '出勤录入', icon: <UserCheck size={20} />, path: '/coach/attendance' },
  ],
  admin: [
    { label: '课程管理', icon: <CalendarDays size={20} />, path: '/admin/classes' },
    { label: '教练管理', icon: <Users size={20} />, path: '/admin/coaches' },
    { label: '运营统计', icon: <BarChart3 size={20} />, path: '/admin/stats' },
    { label: '规则设置', icon: <Settings size={20} />, path: '/admin/rules' },
    { label: '报表导出', icon: <FileDown size={20} />, path: '/admin/reports' },
  ],
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role || 'member'
  const navItems = NAV_BY_ROLE[role]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-[#121220]">
      <aside className="hidden md:flex w-60 flex-col bg-carbon border-r border-white/5">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-orange-accent flex items-center justify-center">
            <span className="font-outfit font-bold text-white text-sm">F</span>
          </div>
          <span className="font-outfit font-bold text-xl text-white">
            Fit<span className="text-orange-accent">Class</span>
          </span>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'text-orange-accent border-l-3 border-orange-accent bg-orange-accent/5'
                    : 'text-gray-400 hover:text-gray-200 border-l-3 border-transparent'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-accent/20 flex items-center justify-center text-orange-accent text-xs font-bold shrink-0">
                {user?.name?.charAt(0) || '?'}
              </div>
              <span className="text-sm text-gray-300 truncate">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-danger transition-colors p-1"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-carbon border-b border-white/5">
          <span className="font-outfit font-bold text-lg text-white">
            Fit<span className="text-orange-accent">Class</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-danger transition-colors"
          >
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-[#121220] p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
