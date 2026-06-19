import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { Package, Booking } from '@/types'

function getProgressColor(ratio: number): string {
  if (ratio > 0.5) return '#00E5A0'
  if (ratio > 0.25) return '#FFB800'
  return '#FF4757'
}

function CircularProgress({ remaining, total }: { remaining: number; total: number }) {
  const size = 180
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = total > 0 ? remaining / total : 0
  const offset = circumference * (1 - ratio)
  const color = getProgressColor(ratio)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A45"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-white">{remaining}</span>
        <span className="text-gray-500 text-sm">/ {total} 次</span>
      </div>
    </div>
  )
}

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [history, setHistory] = useState<Booking[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true)
        const [pkgData, bookingsData] = await Promise.all([
          apiGet<Package[]>('/api/members/my/packages'),
          apiGet<Booking[]>('/api/bookings/my?status=completed'),
        ])
        setPackages(pkgData)
        setHistory(bookingsData)

        const allBookings = await apiGet<Booking[]>('/api/bookings/my?status=booked')
        setPendingCount(allBookings.filter(b => !b.session_deducted).length)
      } catch {} finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">暂无课时包信息</div>
    )
  }

  const primary = packages[0]
  const totalRemaining = packages.reduce((sum, p) => sum + p.remaining_sessions, 0)
  const totalSessions = packages.reduce((sum, p) => sum + p.total_sessions, 0)

  const sortedHistory = [...history].sort((a, b) => {
    const dateA = a.class_info?.date || a.booked_at
    const dateB = b.class_info?.date || b.booked_at
    return dateB.localeCompare(dateA)
  })

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="bg-carbon rounded-2xl p-8 border border-white/5 flex flex-col items-center">
        <h2 className="text-white font-bold text-lg mb-6">我的课时包</h2>
        <CircularProgress remaining={primary.remaining_sessions} total={primary.total_sessions} />
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="text-gray-400">
            有效期至 <span className="text-white">{primary.expires_at?.split('T')[0]}</span>
          </div>
        </div>
        {packages.length > 1 && (
          <div className="mt-3 text-gray-500 text-xs">
            多个课时包合计：{totalRemaining} / {totalSessions} 次
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
            {pendingCount}
          </div>
          <div>
            <div className="text-blue-400 text-sm font-medium">待扣课预约</div>
            <div className="text-gray-400 text-xs mt-0.5">
              {pendingCount} 节课已锁座，开课前2小时将自动扣课
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-white font-bold text-base mb-4">扣课记录</h3>
        {sortedHistory.length === 0 ? (
          <div className="text-center text-gray-500 py-10">暂无扣课记录</div>
        ) : (
          <div className="space-y-2">
            {sortedHistory.map((booking) => (
              <div
                key={booking.id}
                className="bg-carbon rounded-xl p-4 border border-white/5 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {booking.class_info?.name || '课程'}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {booking.class_info?.date} {booking.class_info?.start_time}
                  </div>
                </div>
                <span className="shrink-0 text-danger text-sm font-medium">-1 次</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
