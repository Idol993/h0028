import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Calendar, Clock, Users, CheckCircle2 } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass } from '@/types'

function isTodayOrBefore(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d <= today
}

function hasClassEnded(cls: GymClass): boolean {
  const now = new Date()
  const end = new Date(`${cls.date}T${cls.end_time}`)
  return now > end
}

export default function CoachAttendanceClasses() {
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

  const pastClasses = useMemo(() => {
    return classes
      .filter((c) => c.coach_id === user?.id && isTodayOrBefore(c.date))
      .filter((c) => hasClassEnded(c))
      .sort((a, b) => {
        const da = new Date(`${a.date}T${a.start_time}`).getTime()
        const db = new Date(`${b.date}T${b.start_time}`).getTime()
        return db - da
      })
  }, [classes, user?.id])

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">出勤录入 - 选择课程</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pastClasses.length === 0 ? (
        <div className="text-center py-20 text-gray-500">暂无已结束的课程</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pastClasses.map((cls) => {
            const hasRecorded = cls.actual_count !== null
            return (
              <div
                key={cls.id}
                className="bg-carbon-light rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <ClassTypeBadge type={cls.type} />
                  {hasRecorded ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-mint/15 text-mint">
                      <CheckCircle2 size={12} />
                      已录入
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
                      待录入
                    </span>
                  )}
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
                      预约 {cls.booked_count} 人
                      {hasRecorded && ` · 实际 ${cls.actual_count} 人`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/coach/attendance/${cls.id}`)}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasRecorded
                      ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                      : 'bg-orange-accent text-white hover:bg-orange-accent/90'
                  }`}
                >
                  {hasRecorded ? '修改出勤' : '录入出勤'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
