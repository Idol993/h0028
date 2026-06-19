import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ScanLine, CheckCircle2, XCircle, Phone } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass, Booking, Checkin } from '@/types'

type TabKey = 'scan' | 'roster'

export default function CoachCheckin() {
  const { classId } = useParams<{ classId: string }>()
  const [cls, setCls] = useState<GymClass | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([])
  const [tab, setTab] = useState<TabKey>('scan')
  const [memberInput, setMemberInput] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchBookings = useCallback(async () => {
    if (!classId) return
    try {
      const data = await apiGet<Booking[]>(`/api/bookings/class/${classId}`)
      setBookings(data)
    } catch {
      setBookings([])
    }
  }, [classId])

  useEffect(() => {
    async function fetchClass() {
      if (!classId) return
      try {
        const data = await apiGet<GymClass>(`/api/classes/${classId}`)
        setCls(data)
      } catch {
        setCls(null)
      } finally {
        setLoading(false)
      }
    }
    fetchClass()
    fetchBookings()
  }, [classId, fetchBookings])

  const handleCheckin = async () => {
    if (!memberInput.trim()) return
    setSubmitting(true)
    setMessage(null)
    try {
      const booking = bookings.find((b) => String(b.member_id) === memberInput.trim())
      if (!booking) {
        setMessage({ type: 'error', text: '未找到该会员的预约记录' })
        return
      }
      const result = await apiPost<Checkin>('/api/checkins', { booking_id: booking.id })
      setRecentCheckins((prev) => [result, ...prev])
      setMessage({ type: 'success', text: `${booking.member_name || '会员'} 签到成功！` })
      setMemberInput('')
      await fetchBookings()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '签到失败' })
    } finally {
      setSubmitting(false)
    }
  }

  const checkedInCount = bookings.filter((b) => b.status === 'completed').length
  const totalBookings = bookings.filter((b) => b.status === 'booked' || b.status === 'completed').length

  const maskPhone = (phone: string) => {
    if (phone.length < 7) return phone
    return phone.slice(0, 3) + '****' + phone.slice(-4)
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

      <div className="flex gap-2">
        <button
          onClick={() => setTab('scan')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'scan'
              ? 'bg-orange-accent text-white'
              : 'bg-white/5 text-gray-400 hover:text-gray-200'
          }`}
        >
          扫码核销
        </button>
        <button
          onClick={() => setTab('roster')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'roster'
              ? 'bg-orange-accent text-white'
              : 'bg-white/5 text-gray-400 hover:text-gray-200'
          }`}
        >
          到场名单
        </button>
      </div>

      {tab === 'scan' && (
        <div className="space-y-6">
          <div className="bg-carbon-light rounded-xl p-10 flex flex-col items-center justify-center">
            <ScanLine size={64} className="text-orange-accent/40 mb-4" />
            <p className="text-gray-400 text-sm">请扫描会员二维码</p>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              placeholder="输入会员ID手动核销"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-accent transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheckin()
              }}
            />
            <button
              onClick={handleCheckin}
              disabled={submitting || !memberInput.trim()}
              className="px-6 py-2.5 bg-orange-accent text-white rounded-lg text-sm font-medium hover:bg-orange-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              核销
            </button>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-mint/10 text-mint'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {recentCheckins.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">最近签到</h3>
              {recentCheckins.map((ci) => {
                const booking = bookings.find((b) => b.id === ci.booking_id)
                return (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between bg-carbon-light rounded-lg px-4 py-3"
                  >
                    <span className="text-white text-sm">
                      {booking?.member_name || `会员 #${booking?.member_id}`}
                    </span>
                    <span className="text-xs text-gray-500">{ci.checked_at}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-carbon-light rounded-xl px-5 py-4">
            <span className="text-gray-400 text-sm">已签到</span>
            <span className="font-outfit font-bold text-xl text-white">
              <span className="text-mint">{checkedInCount}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span>{totalBookings}</span>
            </span>
          </div>

          <div className="space-y-2">
            {bookings
              .filter((b) => b.status === 'booked' || b.status === 'completed' || b.status === 'no_show')
              .map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between bg-carbon-light rounded-lg px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-300 text-xs font-bold">
                      {booking.member_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-white text-sm">{booking.member_name}</div>
                      {booking.class_info?.coach_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone size={10} />
                          <span>{maskPhone(booking.member_name || '')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {booking.status === 'completed' && (
                      <CheckCircle2 size={20} className="text-mint" />
                    )}
                    {booking.status === 'booked' && (
                      <span className="w-3 h-3 rounded-full bg-orange-accent inline-block" />
                    )}
                    {booking.status === 'no_show' && (
                      <XCircle size={20} className="text-danger" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
