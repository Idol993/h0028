import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass } from '@/types'

type DateFilter = 'today' | 'week' | 'all'

function getClassStatus(cls: GymClass): { label: string; className: string } {
  const now = new Date()
  const dateStr = cls.date
  const start = new Date(`${dateStr}T${cls.start_time}`)
  const end = new Date(`${dateStr}T${cls.end_time}`)

  if (now < start) {
    return { label: '待开课', className: 'bg-blue-500/15 text-blue-400' }
  }
  if (now >= start && now <= end) {
    return { label: '进行中', className: 'bg-orange-accent/15 text-orange-accent' }
  }
  return { label: '已结束', className: 'bg-gray-500/15 text-gray-400' }
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function isThisWeek(dateStr: string): boolean {
  const now = new Date()
  const d = new Date(dateStr)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek
}

export default function CoachClasses() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [classes, setClasses] = useState<GymClass[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DateFilter>('today')

  useEffect(() => {
    async function fetchClasses() {
      try {
        const data = await apiGet<GymClass[]>('/api/classes')
        setClasses(data)
      } catch {
        setClasses([])
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  const myClasses = useMemo(
    () => classes.filter((c) => c.coach_id === user?.id),
    [classes, user?.id]
  )

  const filtered = useMemo(() => {
    if (filter === 'today') return myClasses.filter((c) => isToday(c.date))
    if (filter === 'week') return myClasses.filter((c) => isThisWeek(c.date))
    return myClasses
  }, [myClasses, filter])

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = new Date(`${a.date}T${a.start_time}`).getTime()
        const db = new Date(`${b.date}T${b.start_time}`).getTime()
        return da - db
      }),
    [filtered]
  )

  const tabs: { key: DateFilter; label: string }[] = [
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'all', label: '全部' },
  ]

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center gap-3">
        <Calendar size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">我的课程</h1>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-orange-accent text-white'
                : 'bg-white/5 text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-500">暂无课程</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((cls) => {
            const status = getClassStatus(cls)
            const isOverCapacity = cls.booked_count / cls.capacity > 0.8
            const today = isToday(cls.date)
            const isEnded = status.label === '已结束'
            const attendanceRate =
              isEnded && cls.actual_count !== null
                ? Math.round((cls.actual_count / cls.booked_count) * 100)
                : null

            return (
              <div
                key={cls.id}
                onClick={() => navigate(`/coach/checkin/${cls.id}`)}
                className={`relative bg-carbon-light rounded-xl p-5 cursor-pointer transition-all hover:bg-white/[0.07] hover:scale-[1.01] ${
                  today ? 'border-l-4 border-l-orange-accent' : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <ClassTypeBadge type={cls.type} />
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <h3 className="font-outfit font-bold text-lg text-white mb-2">{cls.name}</h3>

                <div className="space-y-1.5 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{cls.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      {cls.start_time} - {cls.end_time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      isOverCapacity ? 'text-orange-accent' : 'text-gray-300'
                    }`}
                  >
                    <Users size={14} />
                    <span>
                      {cls.booked_count} / {cls.capacity}
                    </span>
                  </div>
                  {attendanceRate !== null && (
                    <span className="text-xs text-gray-500">
                      到场率 {attendanceRate}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
