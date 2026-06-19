import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass, ClassType } from '@/types'

interface Coach {
  id: number
  name: string
}

const TYPE_OPTIONS: { value: ClassType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'yoga', label: '瑜伽' },
  { value: 'boxing', label: '搏击' },
  { value: 'spinning', label: '动感单车' },
  { value: 'pilates', label: '普拉提' },
]

const CLASS_FORM_DEFAULTS = {
  name: '',
  type: 'yoga' as ClassType,
  coach_id: 0,
  date: '',
  start_time: '',
  end_time: '',
  capacity: 20,
}

export default function Classes() {
  const [classes, setClasses] = useState<GymClass[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterCoach, setFilterCoach] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingClass, setEditingClass] = useState<GymClass | null>(null)
  const [deletingClass, setDeletingClass] = useState<GymClass | null>(null)
  const [form, setForm] = useState(CLASS_FORM_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterDateFrom) params.set('date', filterDateFrom)
      const qs = params.toString()
      const res = await apiGet<GymClass[]>(`/api/classes${qs ? `?${qs}` : ''}`)
      let data = res
      if (filterDateTo) {
        data = data.filter(c => c.date <= filterDateTo)
      }
      if (filterCoach) {
        data = data.filter(c => c.coach_id === Number(filterCoach))
      }
      setClasses(data)
    } catch {
      setError('获取课程列表失败')
    } finally {
      setLoading(false)
    }
  }, [filterType, filterDateFrom, filterDateTo, filterCoach])

  const fetchCoaches = useCallback(async () => {
    try {
      const res = await apiGet<any[]>('/api/stats/coaches')
      setCoaches(res.map(c => ({ id: c.id, name: c.name })))
    } catch {
      setCoaches([])
    }
  }, [])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const openAddModal = () => {
    setEditingClass(null)
    setForm(CLASS_FORM_DEFAULTS)
    setError('')
    setShowModal(true)
  }

  const openEditModal = (gymClass: GymClass) => {
    setEditingClass(gymClass)
    setForm({
      name: gymClass.name,
      type: gymClass.type,
      coach_id: gymClass.coach_id,
      date: gymClass.date,
      start_time: gymClass.start_time,
      end_time: gymClass.end_time,
      capacity: gymClass.capacity,
    })
    setError('')
    setShowModal(true)
  }

  const openDeleteModal = (gymClass: GymClass) => {
    setDeletingClass(gymClass)
    setShowDeleteModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.coach_id || !form.date || !form.start_time || !form.end_time) {
      setError('请填写完整信息')
      return
    }
    try {
      setSaving(true)
      setError('')
      if (editingClass) {
        await apiPut(`/api/classes/${editingClass.id}`, form)
      } else {
        await apiPost('/api/classes', form)
      }
      setShowModal(false)
      fetchClasses()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingClass) return
    try {
      await apiDelete(`/api/classes/${deletingClass.id}`)
      setShowDeleteModal(false)
      setDeletingClass(null)
      fetchClasses()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  const getAttendanceRate = (c: GymClass) => {
    if (!c.booked_count || c.booked_count === 0) return 0
    return ((c.actual_count || 0) / c.booked_count) * 100
  }

  const isLowAttendance = (c: GymClass) => {
    const rate = getAttendanceRate(c)
    return c.actual_count !== null && c.booked_count > 0 && rate < 50
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">课程管理</h1>
      </div>

      <div className="bg-carbon rounded-xl border border-white/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-orange-accent hover:bg-orange-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            新增课程
          </button>

          <div className="flex-1" />

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-carbon-light border border-white/10 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="bg-carbon-light border border-white/10 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
          />
          <span className="text-gray-500 text-sm">至</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="bg-carbon-light border border-white/10 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
          />

          <select
            value={filterCoach}
            onChange={e => setFilterCoach(e.target.value)}
            className="bg-carbon-light border border-white/10 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
          >
            <option value="">全部教练</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && !showModal && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-carbon rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">课程名称</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">类型</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">教练</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">日期</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">时间</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">容量</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">预约数</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">到场数</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">出勤率</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">加载中...</td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">暂无课程数据</td>
                </tr>
              ) : (
                classes.map(c => (
                  <tr
                    key={c.id}
                    className={`border-b border-white/5 transition-colors ${
                      isLowAttendance(c) ? 'bg-warning/10' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3"><ClassTypeBadge type={c.type} /></td>
                    <td className="px-4 py-3 text-gray-300">{c.coach_name}</td>
                    <td className="px-4 py-3 text-gray-300">{c.date}</td>
                    <td className="px-4 py-3 text-gray-300">{c.start_time} - {c.end_time}</td>
                    <td className="px-4 py-3 text-gray-300">{c.capacity}</td>
                    <td className="px-4 py-3 text-gray-300">{c.booked_count}</td>
                    <td className="px-4 py-3 text-gray-300">{c.actual_count ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={
                        c.actual_count !== null && c.booked_count > 0
                          ? getAttendanceRate(c) < 50
                            ? 'text-warning font-medium'
                            : getAttendanceRate(c) >= 80
                              ? 'text-mint font-medium'
                              : 'text-gray-300'
                          : 'text-gray-500'
                      }>
                        {c.actual_count !== null && c.booked_count > 0
                          ? `${getAttendanceRate(c).toFixed(1)}%`
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-orange-accent transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(c)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-danger transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-carbon-light rounded-xl border border-white/10 w-full max-w-lg mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="font-outfit font-semibold text-lg text-white">
                {editingClass ? '编辑课程' : '新增课程'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-2 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-1">课程名称</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">课程类型</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as ClassType }))}
                    className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                  >
                    <option value="yoga">瑜伽</option>
                    <option value="boxing">搏击</option>
                    <option value="spinning">动感单车</option>
                    <option value="pilates">普拉提</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">教练</label>
                  <select
                    value={form.coach_id}
                    onChange={e => setForm(f => ({ ...f, coach_id: Number(e.target.value) }))}
                    className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                  >
                    <option value={0}>选择教练</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">日期</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">开始时间</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">结束时间</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-carbon border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">容量</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
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
                {saving ? '保存中...' : '保存'}
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
                确定要删除课程「{deletingClass?.name}」吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex justify-center gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingClass(null) }}
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
