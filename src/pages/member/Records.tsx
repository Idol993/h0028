import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiDelete } from '@/lib/api'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import StatusBadge from '@/components/StatusBadge'
import type { Booking, BookingStatus } from '@/types'

const STATUS_TABS: { label: string; value: BookingStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '待上课', value: 'booked' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '爽约', value: 'no_show' },
]

export default function Records() {
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(true)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const url =
        activeTab === 'all'
          ? '/api/bookings/my'
          : `/api/bookings/my?status=${activeTab}`
      const data = await apiGet<Booking[]>(url)
      setBookings(data)
    } catch {
      showToast('获取预约记录失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTab, showToast])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleCancel = async (bookingId: number) => {
    try {
      await apiDelete(`/api/bookings/${bookingId}`)
      showToast('取消预约成功')
      fetchBookings()
    } catch (err: any) {
      showToast(err.message || '取消失败', 'error')
    }
  }

  const sorted = [...bookings].sort((a, b) => {
    const dateA = a.class_info?.date || a.booked_at
    const dateB = b.class_info?.date || b.booked_at
    return dateB.localeCompare(dateA)
  })

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

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-orange-accent/20 text-orange-accent border border-orange-accent/30'
                : 'bg-carbon text-gray-400 border border-white/5 hover:bg-carbon-light'
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
        <div className="text-center text-gray-500 py-20">暂无预约记录</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((booking) => (
            <div
              key={booking.id}
              className="bg-carbon rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {booking.class_info && <ClassTypeBadge type={booking.class_info.type} />}
                    <StatusBadge status={booking.status} />
                  </div>
                  <h3 className="text-white font-bold text-base mb-2 truncate">
                    {booking.class_info?.name || '课程'}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-400">
                    {booking.class_info && (
                      <>
                        <div>
                          {booking.class_info.date} {booking.class_info.start_time} - {booking.class_info.end_time}
                        </div>
                        <div>{booking.class_info.coach_name}</div>
                      </>
                    )}
                  </div>
                </div>

                {booking.status === 'booked' && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="shrink-0 px-4 py-2 rounded-xl border border-danger/30 text-danger text-sm hover:bg-danger/10 transition-colors"
                  >
                    取消预约
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
