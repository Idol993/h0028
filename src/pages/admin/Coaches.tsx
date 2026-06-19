import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import type { CoachStat } from '@/types'

interface CoachInfo {
  id: number
  name: string
  phone: string
  class_count: number
  avg_attendance_rate: number
}

const COACH_FORM_DEFAULTS = {
  name: '',
  phone: '',
  password: '',
}

export default function Coaches() {
  const [coaches, setCoaches] = useState<CoachInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingCoach, setDeletingCoach] = useState<CoachInfo | null>(null)
  const [form, setForm] = useState(COACH_FORM_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchCoaches = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet<CoachInfo[]>('/api/stats/coaches')
      setCoaches(res)
    } catch {
      setError('获取教练数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  const openAddModal = () => {
    setForm(COACH_FORM_DEFAULTS)
    setError('')
    setShowModal(true)
  }

  const openDeleteModal = (coach: CoachInfo) => {
    setDeletingCoach(coach)
    setShowDeleteModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.password) {
      setError('请填写完整信息')
      return
    }
    try {
      setSaving(true)
      setError('')
      await apiPost('/api/auth/register', { ...form, role: 'coach' })
      setShowModal(false)
      fetchCoaches()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCoach) return
    try {
      await apiDelete(`/api/users/${deletingCoach.id}`)
      setShowDeleteModal(false)
      setDeletingCoach(null)
      fetchCoaches()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  const chartData = coaches.map(c => ({
    name: c.name,
    classCount: c.class_count,
    attendanceRate: Math.round(c.avg_attendance_rate * 100),
  }))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Users size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">教练管理</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-orange-accent hover:bg-orange-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          添加教练
        </button>
      </div>

      {error && !showModal && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : coaches.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无教练数据</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map(coach => (
              <div
                key={coach.id}
                className="bg-carbon rounded-xl border border-white/5 p-5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-accent/20 flex items-center justify-center text-orange-accent font-bold">
                      {coach.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{coach.name}</h3>
                      <p className="text-gray-500 text-sm">{coach.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-orange-accent transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(coach)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-carbon-light rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">带课数</p>
                    <p className="text-white font-outfit font-bold text-xl">{coach.class_count}</p>
                  </div>
                  <div className="bg-carbon-light rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">平均出勤率</p>
                    <p className={`font-outfit font-bold text-xl ${
                      coach.avg_attendance_rate < 0.5
                        ? 'text-warning'
                        : coach.avg_attendance_rate >= 0.8
                          ? 'text-mint'
                          : 'text-white'
                    }`}>
                      {Math.round(coach.avg_attendance_rate * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-carbon rounded-xl border border-white/5 p-6">
            <h2 className="font-outfit font-semibold text-lg text-white mb-4">教练带课统计</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#222240',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar yAxisId="left" dataKey="classCount" name="带课数" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="attendanceRate" name="出勤率(%)" fill="#00E5A0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-carbon-light rounded-xl border border-white/10 w-full max-w-md mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-outfit font-semibold text-lg text-white">添加教练</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-2 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-gray-400 text-sm mb-1">姓名</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">手机号</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">密码</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-orange-accent hover:bg-orange-accent/90 text-white font-medium transition-colors disabled:opacity-50"
              >
                {saving ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-carbon-light rounded-xl border border-white/10 w-full max-w-md mx-4 animate-fade-in">
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <h3 className="font-outfit font-semibold text-lg text-white mb-2">确认删除</h3>
              <p className="text-gray-400 text-sm">
                确定要删除教练「{deletingCoach?.name}」吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex justify-center gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingCoach(null) }}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm bg-danger hover:bg-danger/90 text-white font-medium transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
