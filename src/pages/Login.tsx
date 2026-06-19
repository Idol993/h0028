import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone, password)
      const user = useAuthStore.getState().user
      const roleRoutes: Record<string, string> = {
        member: '/member/schedule',
        coach: '/coach/classes',
        admin: '/admin/classes',
      }
      navigate(roleRoutes[user?.role || 'member'] || '/member/schedule')
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-carbon-dark to-carbon px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-outfit text-5xl font-bold text-white mb-2">
            Fit<span className="text-orange-accent">Class</span>
          </h1>
          <p className="text-gray-400 font-noto text-sm">健身团课预约系统</p>
        </div>

        <div className="bg-carbon rounded-2xl p-8 shadow-2xl border border-white/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手机号"
                  className="w-full bg-carbon-dark border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-accent/50 focus:ring-1 focus:ring-orange-accent/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  className="w-full bg-carbon-dark border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-accent/50 focus:ring-1 focus:ring-orange-accent/30 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-orange-accent to-[#ff8f5e] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
