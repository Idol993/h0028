import { useState, useEffect, useCallback } from 'react'
import { Clock, User } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass, Booking, ClassType } from '@/types'

const CLASS_TYPE_FILTERS: { label: string; value: ClassType | 'all'; color: string }[] = [
  { label: '全部', value: 'all', color: '' },
  { label: '瑜伽', value: 'yoga', color: 'class-yoga' },
  { label: '搏击', value: 'boxing', color: 'class-boxing' },
  { label: '动感单车', value: 'spinning', color: 'class-spinning' },
  { label: '普拉提', value: 'pilates', color: 'class-pilates' },
]

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function getWeekDates(baseDate: Date): Date[] {
  const day = baseDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCapacityColor(ratio: number): string {
  if (ratio > 0.9) return 'bg-danger'
  if (ratio > 0.7) return 'bg-warning'
  return 'bg-mint'
}

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [filter, setFilter] = useState<ClassType | 'all'>('all')
  const [classes, setClasses] = useState<GymClass[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.user)
  const weekDates = getWeekDates(new Date())

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiGet<GymClass[]>(`/api/classes?week_start=${selectedDate}`)
      setClasses(data)
    } catch {
      showToast('获取课程失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, showToast])

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiGet<Booking[]>('/api/bookings/my?status=booked')
      setBookings(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchClasses()
    fetchBookings()
  }, [fetchClasses, fetchBookings])

  const isBooked = (classId: number) => bookings.some((b) => b.class_id === classId)
  const getBookingId = (classId: number) => bookings.find((b) => b.class_id === classId)?.id

  const handleBook = async (classId: number) => {
    try {
      await apiPost<Booking>('/api/bookings', { class_id: classId })
      showToast('预约成功')
      fetchBookings()
      fetchClasses()
    } catch (err: any) {
      showToast(err.message || '预约失败', 'error')
    }
  }

  const handleCancel = async (bookingId: number) => {
    try {
      await apiDelete(`/api/bookings/${bookingId}`)
      showToast('取消预约成功')
      fetchBookings()
      fetchClasses()
    } catch (err: any) {
      showToast(err.message || '取消失败', 'error')
    }
  }

  const filtered = filter === 'all' ? classes : classes.filter((c) => c.type === filter)

  return (
    <div className="animate-fadeIn">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-mint/20 text-mint border border-mint/30'
              : 'bg-danger/20 text-danger border border-danger/30'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {weekDates.map((d, i) => {
          const dateStr = formatDate(d)
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === formatDate(new Date())
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center min-w-[52px] py-2 px-3 rounded-xl transition-colors ${
                isSelected
                  ? 'bg-orange-accent text-white'
                  : isToday
                  ? 'bg-orange-accent/10 text-orange-accent'
                  : 'bg-carbon text-gray-400 hover:bg-carbon-light'
              }`}
            >
              <span className="text-xs">{WEEKDAYS[i]}</span>
              <span className="text-lg font-bold">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CLASS_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === f.value
                ? f.color
                  ? `bg-${f.color}/20 text-${f.color} border border-${f.color}/30`
                  : 'bg-orange-accent/20 text-orange-accent border border-orange-accent/30'
                : 'bg-carbon text-gray-400 border border-white/5 hover:bg-carbon-light'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无课程</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls) => {
            const ratio = cls.capacity > 0 ? cls.booked_count / cls.capacity : 0
            const remaining = cls.capacity - cls.booked_count
            const booked = isBooked(cls.id)
            const full = remaining <= 0 && !booked
            const bookingId = getBookingId(cls.id)

            return (
              <div
                key={cls.id}
                className="bg-carbon rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="mb-3">
                  <ClassTypeBadge type={cls.type} />
                </div>

                <h3 className="text-white font-bold text-lg mb-3">{cls.name}</h3>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>
                      {cls.start_time} - {cls.end_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    <span>{cls.coach_name}</span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{cls.booked_count}/{cls.capacity}</span>
                    <span className={remaining <= 0 ? 'text-danger' : remaining <= 3 ? 'text-warning' : 'text-mint'}>
                      剩余 {remaining} 位
                    </span>
                  </div>
                  <div className="h-1.5 bg-carbon-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getCapacityColor(ratio)}`}
                      style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {booked ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-center py-2 rounded-xl bg-mint/15 text-mint text-sm font-medium">
                        已预约
                      </span>
                      {bookingId && (
                        <button
                          onClick={() => handleCancel(bookingId)}
                          className="px-4 py-2 rounded-xl border border-danger/30 text-danger text-sm hover:bg-danger/10 transition-colors"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  ) : full ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl bg-gray-700 text-gray-500 text-sm cursor-not-allowed"
                    >
                      已满
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBook(cls.id)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-accent to-[#ff8f5e] text-white text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    >
                      预约
                    </button>
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
