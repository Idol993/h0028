import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Calendar, ClipboardList, Package, User } from 'lucide-react'

const TABS = [
  { label: '课表', icon: <Calendar size={20} />, path: '/member/schedule' },
  { label: '预约', icon: <ClipboardList size={20} />, path: '/member/bookings' },
  { label: '课时', icon: <Package size={20} />, path: '/member/packages' },
  { label: '我的', icon: <User size={20} />, path: '/member/profile' },
]

export default function MemberLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-[#121220]">
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-carbon border-t border-white/5 flex items-center justify-around py-2 z-50">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? 'text-orange-accent' : 'text-gray-500'
              }`
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <aside className="hidden md:flex w-60 flex-col bg-carbon border-r border-white/5 fixed left-0 top-0 bottom-0">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-orange-accent flex items-center justify-center">
            <span className="font-outfit font-bold text-white text-sm">F</span>
          </div>
          <span className="font-outfit font-bold text-xl text-white">
            Fit<span className="text-orange-accent">Class</span>
          </span>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <NavLink
            to="/member/schedule"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'text-orange-accent border-l-3 border-orange-accent bg-orange-accent/5'
                  : 'text-gray-400 hover:text-gray-200 border-l-3 border-transparent'
              }`
            }
          >
            <Calendar size={20} />
            <span>课表</span>
          </NavLink>
          <NavLink
            to="/member/bookings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'text-orange-accent border-l-3 border-orange-accent bg-orange-accent/5'
                  : 'text-gray-400 hover:text-gray-200 border-l-3 border-transparent'
              }`
            }
          >
            <ClipboardList size={20} />
            <span>我的预约</span>
          </NavLink>
          <NavLink
            to="/member/packages"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'text-orange-accent border-l-3 border-orange-accent bg-orange-accent/5'
                  : 'text-gray-400 hover:text-gray-200 border-l-3 border-transparent'
              }`
            }
          >
            <Package size={20} />
            <span>课时包</span>
          </NavLink>
          <NavLink
            to="/member/qrcode"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'text-orange-accent border-l-3 border-orange-accent bg-orange-accent/5'
                  : 'text-gray-400 hover:text-gray-200 border-l-3 border-transparent'
              }`
            }
          >
            <User size={20} />
            <span>签到码</span>
          </NavLink>
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
              <span className="text-xs">退出</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
