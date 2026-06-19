import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Calendar, Clock, Users } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass } from '@/types'

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function getClassStatus(cls: GymClass): { label: string; className: string; canCheckin: boolean } {
  const now = new Date()
  const dateStr = cls.date
  const start = new Date(`${dateStr}T${cls.start_time}`)
  const end = new Date(`${dateStr}T${cls.end_time}`)

  if (now < start) {
    return { label: '待开课', className: 'bg-blue-500/15 text-blue-400', canCheckin: true }
  }
  if (now >= start && now <= end) {
    return { label: '进行中', className: 'bg-orange-accent/15 text-orange-accent', canCheckin: true }
  }
  return { label: '已结束', className: 'bg-gray-500/15 text-gray-400', canCheckin: false }
}

export default function CoachCheckinClasses() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [classes, setClasses] = useState<GymClass[]>([])
  const [loading, setLoading] = useState(true)

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

  const todayClasses = useMemo(() => {
    return classes
      .filter((c) => c.coach_id === user?.id && isToday(c.date))
      .sort((a, b) => {
        const da = new Date(`${a.date}T${a.start_time}`).getTime()
        const db = new Date(`${b.date}T${b.start_time}`).getTime()
        return da - db
      })
  }, [classes, user?.id])

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center gap-3">
        <ScanLine size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">扫码核销 - 选择课程</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : todayClasses.length === 0 ? (
        <div className="text-center py-20 text-gray-500">今日暂无课程</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {todayClasses.map((cls) => {
            const status = getClassStatus(cls)
            return (
              <div
                key={cls.id}
                className="bg-carbon-light rounded-xl p-5 border-l-4 border-l-orange-accent"
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

                <div className="space-y-1.5 text-sm text-gray-400 mb-4">
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
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    <span>
                      已预约 {cls.booked_count} / {cls.capacity} 人
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/coach/checkin/${cls.id}`)}
                  disabled={!status.canCheckin}
                  className="w-full py-2.5 bg-orange-accent text-white rounded-lg text-sm font-medium hover:bg-orange-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  开始核销
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
