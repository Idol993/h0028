import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Minus, Plus, AlertTriangle } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass } from '@/types'

export default function CoachAttendance() {
  const { classId } = useParams<{ classId: string }>()
  const [cls, setCls] = useState<GymClass | null>(null)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchClass() {
      if (!classId) return
      try {
        const data = await apiGet<GymClass>(`/api/classes/${classId}`)
        setCls(data)
        setCount(data.actual_count ?? data.booked_count)
      } catch {
        setCls(null)
      } finally {
        setLoading(false)
      }
    }
    fetchClass()
  }, [classId])

  const handleSave = async () => {
    if (!classId) return
    setSaving(true)
    try {
      await apiPost(`/api/checkins/attendance/${classId}`, { actual_count: count })
      setSaved(true)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!cls) {
    return <div className="text-center py-20 text-gray-500">课程不存在</div>
  }

  const attendanceRate = cls.booked_count > 0 ? Math.round((count / cls.booked_count) * 100) : 0
  const rateColor = attendanceRate >= 80 ? 'text-mint' : attendanceRate >= 50 ? 'text-warning' : 'text-danger'
  const isLowRate = attendanceRate < 50

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="bg-carbon-light rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <ClassTypeBadge type={cls.type} />
          <h1 className="font-outfit font-bold text-xl text-white">{cls.name}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{cls.date}</span>
          <span>
            {cls.start_time} - {cls.end_time}
          </span>
        </div>
      </div>

      <div className="bg-carbon-light rounded-xl p-8 flex flex-col items-center">
        <p className="text-gray-400 text-sm mb-6">实际到场人数</p>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Minus size={24} className="text-white" />
          </button>
          <span className="font-outfit font-bold text-6xl text-orange-accent min-w-[100px] text-center">
            {count}
          </span>
          <button
            onClick={() => setCount((c) => c + 1)}
            className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Plus size={24} className="text-white" />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="mt-8 px-8 py-3 bg-orange-accent text-white rounded-lg font-medium hover:bg-orange-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : saved ? '已保存' : '保存到场人数'}
        </button>
      </div>

      {saved && (
        <div className="bg-carbon-light rounded-xl p-6 space-y-4 animate-fadeIn">
          <h3 className="text-sm font-medium text-gray-400">到场统计</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">预约人数</p>
              <p className="font-outfit font-bold text-2xl text-white">{cls.booked_count}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">实际到场</p>
              <p className="font-outfit font-bold text-2xl text-orange-accent">{count}</p>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 mb-1">到场率</p>
            <p className={`font-outfit font-bold text-3xl ${rateColor}`}>{attendanceRate}%</p>
          </div>

          {isLowRate && (
            <div className="flex items-center gap-2 justify-center text-danger text-sm">
              <AlertTriangle size={16} />
              <span>到场率低于50%，请注意</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
