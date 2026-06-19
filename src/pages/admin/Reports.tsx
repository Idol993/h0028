import { useState, useEffect, useCallback } from 'react'
import { FileDown, CalendarDays, Users, BarChart3, UserX } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { apiGet } from '@/lib/api'
import type { AttendanceStat } from '@/types'

interface AttendanceApiItem {
  type: string
  total_classes: number
  total_booked: number
  total_attended: number
  attendance_rate: number
  warning: boolean
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

const TYPE_LABELS: Record<string, string> = {
  yoga: '瑜伽',
  boxing: '搏击',
  spinning: '动感单车',
  pilates: '普拉提',
}

export default function Reports() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [attendance, setAttendance] = useState<AttendanceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet<AttendanceApiItem[]>('/api/stats/attendance')
      setAttendance(res.map(a => ({
        type: a.type,
        rate: a.attendance_rate,
        isWarning: a.warning,
        totalClasses: a.total_classes,
        totalBooked: a.total_booked,
        totalAttended: a.total_attended,
      })))
    } catch {
      setError('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const totalClasses = attendance.reduce((s, a) => s + a.totalClasses, 0)
  const avgRate = attendance.length > 0
    ? attendance.reduce((s, a) => s + a.rate, 0) / attendance.length
    : 0
  const totalBooked = attendance.reduce((s, a) => s + a.totalBooked, 0)
  const totalAttended = attendance.reduce((s, a) => s + a.totalAttended, 0)

  const trendData = attendance.map(a => ({
    type: TYPE_LABELS[a.type] || a.type,
    rate: Math.round(a.rate * 100),
    booked: a.totalBooked,
    attended: a.totalAttended,
  }))

  const handleExport = async () => {
    try {
      setExporting(true)
      setError('')
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reports/monthly?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '导出失败' }))
        throw new Error(err.error || '导出失败')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monthly-report-${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <FileDown size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">报表导出</h1>
      </div>

      <div className="bg-carbon rounded-xl border border-white/5 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">选择月份</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-carbon-light border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-orange-accent hover:bg-orange-accent/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <FileDown size={16} />
            {exporting ? '导出中...' : '导出月度报表'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-carbon rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-orange-accent/15 flex items-center justify-center">
                  <CalendarDays size={18} className="text-orange-accent" />
                </div>
                <span className="text-gray-400 text-sm">总课程数</span>
              </div>
              <p className="font-outfit font-bold text-3xl text-white">{totalClasses}</p>
            </div>
            <div className="bg-carbon rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-mint/15 flex items-center justify-center">
                  <BarChart3 size={18} className="text-mint" />
                </div>
                <span className="text-gray-400 text-sm">平均出勤率</span>
              </div>
              <p className="font-outfit font-bold text-3xl text-mint">{Math.round(avgRate * 100)}%</p>
            </div>
            <div className="bg-carbon rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Users size={18} className="text-blue-400" />
                </div>
                <span className="text-gray-400 text-sm">总预约数</span>
              </div>
              <p className="font-outfit font-bold text-3xl text-white">{totalBooked}</p>
            </div>
            <div className="bg-carbon rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-mint/15 flex items-center justify-center">
                  <UserX size={18} className="text-mint" />
                </div>
                <span className="text-gray-400 text-sm">总到场数</span>
              </div>
              <p className="font-outfit font-bold text-3xl text-white">{totalAttended}</p>
            </div>
          </div>

          <div className="bg-carbon rounded-xl border border-white/5 p-6">
            <h2 className="font-outfit font-semibold text-lg text-white mb-4">各类别出勤率趋势</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="type" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#222240',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'rate') return [`${value}%`, '出勤率']
                    return [value, name]
                  }}
                />
                <Line type="monotone" dataKey="rate" stroke="#FF6B35" strokeWidth={2} dot={{ r: 4, fill: '#FF6B35' }} name="rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
