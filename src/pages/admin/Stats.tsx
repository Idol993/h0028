import { useState, useEffect, useCallback } from 'react'
import { BarChart3, AlertTriangle, Users, CalendarDays, UserX, Ban } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { apiGet } from '@/lib/api'
import type { AttendanceStat, NoShowRecord, CoachStat } from '@/types'

interface AttendanceApiItem {
  type: string
  total_classes: number
  total_booked: number
  total_attended: number
  attendance_rate: number
  warning: boolean
}

interface NoShowApiItem {
  member_id: number
  member_name: string
  phone: string
  no_show_count: number
  suspended: boolean
}

interface CoachApiItem {
  id: number
  name: string
  class_count: number
  avg_attendance_rate: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

const TYPE_COLORS: Record<string, string> = {
  yoga: '#8B5CF6',
  boxing: '#EF4444',
  spinning: '#3B82F6',
  pilates: '#10B981',
}

const TYPE_LABELS: Record<string, string> = {
  yoga: '瑜伽',
  boxing: '搏击',
  spinning: '动感单车',
  pilates: '普拉提',
}

export default function Stats() {
  const [attendance, setAttendance] = useState<AttendanceStat[]>([])
  const [noShows, setNoShows] = useState<NoShowRecord[]>([])
  const [coaches, setCoaches] = useState<CoachStat[]>([])
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<{ no_show_threshold: number } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [attRes, nsRes, coachRes, rulesRes] = await Promise.all([
        apiGet<AttendanceApiItem[]>('/api/stats/attendance'),
        apiGet<NoShowApiItem[]>('/api/stats/no-shows'),
        apiGet<CoachApiItem[]>('/api/stats/coaches'),
        apiGet<{ no_show_threshold: number }>('/api/rules'),
      ])
      setAttendance(attRes.map(a => ({
        type: a.type,
        rate: a.attendance_rate,
        isWarning: a.warning,
        totalClasses: a.total_classes,
        totalBooked: a.total_booked,
        totalAttended: a.total_attended,
      })))
      setNoShows(nsRes.map(n => ({
        memberId: n.member_id,
        name: n.member_name,
        phone: n.phone,
        count: n.no_show_count,
        isSuspended: n.suspended,
      })))
      setCoaches(coachRes.map(c => ({
        coachId: c.id,
        name: c.name,
        classCount: c.class_count,
        avgAttendance: c.avg_attendance_rate,
      })))
      setRules(rulesRes)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalClasses = attendance.reduce((s, a) => s + a.totalClasses, 0)
  const avgAttendance = attendance.length > 0
    ? attendance.reduce((s, a) => s + a.rate, 0) / attendance.length
    : 0
  const totalNoShows = noShows.reduce((s, n) => s + n.count, 0)
  const suspendedCount = noShows.filter(n => n.isSuspended).length

  const chartData = attendance.map(a => ({
    type: TYPE_LABELS[a.type] || a.type,
    rate: Math.round(a.rate * 100),
    isWarning: a.isWarning,
    rawType: a.type,
  }))

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">运营统计</h1>
      </div>

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
          <p className="font-outfit font-bold text-3xl text-mint">{Math.round(avgAttendance * 100)}%</p>
        </div>
        <div className="bg-carbon rounded-xl border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
              <UserX size={18} className="text-warning" />
            </div>
            <span className="text-gray-400 text-sm">爽约人次</span>
          </div>
          <p className="font-outfit font-bold text-3xl text-warning">{totalNoShows}</p>
        </div>
        <div className="bg-carbon rounded-xl border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-danger/15 flex items-center justify-center">
              <Ban size={18} className="text-danger" />
            </div>
            <span className="text-gray-400 text-sm">暂停预约人数</span>
          </div>
          <p className="font-outfit font-bold text-3xl text-danger">{suspendedCount}</p>
        </div>
      </div>

      <div className="bg-carbon rounded-xl border border-white/5 p-6">
        <h2 className="font-outfit font-semibold text-lg text-white mb-4">出勤率排行</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis type="category" dataKey="type" tick={{ fill: '#9CA3AF', fontSize: 12 }} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#222240',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [`${value}%`, '出勤率']}
            />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isWarning ? '#FFB800' : TYPE_COLORS[entry.rawType] || '#FF6B35'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {chartData.some(d => d.isWarning) && (
          <div className="flex items-center gap-2 mt-3 text-warning text-sm">
            <AlertTriangle size={16} />
            <span>出勤率低于50%的课程类型需关注</span>
          </div>
        )}
      </div>

      <div className="bg-carbon rounded-xl border border-white/5 p-6">
        <h2 className="font-outfit font-semibold text-lg text-white mb-4">爽约名单</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">会员</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">手机号</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">爽约次数</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {noShows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">暂无爽约记录</td>
                </tr>
              ) : (
                noShows.map(n => (
                  <tr
                    key={n.memberId}
                    className={`border-b border-white/5 ${
                      n.count >= (rules?.no_show_threshold ?? 3) ? 'bg-danger/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-white">{n.name}</td>
                    <td className="px-4 py-3 text-gray-300">{n.phone}</td>
                    <td className="px-4 py-3">
                      <span className={n.count >= (rules?.no_show_threshold ?? 3) ? 'text-danger font-medium' : 'text-gray-300'}>
                        {n.count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {n.isSuspended ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/15 text-danger">
                          已暂停预约
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">正常</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-carbon rounded-xl border border-white/5 p-6">
        <h2 className="font-outfit font-semibold text-lg text-white mb-4">教练带课统计</h2>
        {coaches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无教练数据</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map(c => (
              <div key={c.coachId} className="bg-carbon-light rounded-lg p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-accent/20 flex items-center justify-center text-orange-accent font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{c.name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-gray-400 text-xs">带课 <span className="text-white font-medium">{c.classCount}</span></span>
                    <span className="text-gray-400 text-xs">出勤率 <span className={`font-medium ${c.avgAttendance < 0.5 ? 'text-warning' : c.avgAttendance >= 0.8 ? 'text-mint' : 'text-white'}`}>{Math.round(c.avgAttendance * 100)}%</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
