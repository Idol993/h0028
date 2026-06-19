import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ScanLine, CheckCircle2, XCircle, Phone, User, X } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import type { GymClass, Booking, Checkin } from '@/types'

type TabKey = 'scan' | 'roster'
type InputMode = 'memberId' | 'phone'

export default function CoachCheckin() {
  const { classId } = useParams<{ classId: string }>()
  const [cls, setCls] = useState<GymClass | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([])
  const [tab, setTab] = useState<TabKey>('scan')
  const [inputMode, setInputMode] = useState<InputMode>('memberId')
  const [memberInput, setMemberInput] = useState('')
  const [foundBooking, setFoundBooking] = useState<Booking | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanInput, setScanInput] = useState('')

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

  const findBooking = useCallback((input: string): Booking | null => {
    const trimmed = input.trim()
    if (!trimmed) return null

    if (inputMode === 'memberId') {
      return bookings.find((b) => String(b.member_id) === trimmed) || null
    } else {
      return bookings.find((b) => {
        const phone = (b as any).member_phone || ''
        return phone.includes(trimmed)
      }) || null
    }
  }, [bookings, inputMode])

  useEffect(() => {
    setFoundBooking(findBooking(memberInput))
  }, [memberInput, findBooking])

  const handleCheckin = async () => {
    const booking = foundBooking
    if (!booking) return
    setSubmitting(true)
    setMessage(null)
    try {
      const result = await apiPost<Checkin>('/api/checkins', { booking_id: booking.id })
      setRecentCheckins((prev) => [result, ...prev])
      setMessage({ type: 'success', text: `${booking.member_name || '会员'} 签到成功！` })
      setMemberInput('')
      setFoundBooking(null)
      await fetchBookings()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '签到失败' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleScanConfirm = () => {
    if (!scanInput.trim()) return
    try {
      const parsed = JSON.parse(scanInput)
      if (parsed.memberId) {
        setInputMode('memberId')
        setMemberInput(String(parsed.memberId))
      }
    } catch {
      setInputMode('memberId')
      setMemberInput(scanInput.trim())
    }
    setShowScanModal(false)
    setScanInput('')
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
          <button
            onClick={() => setShowScanModal(true)}
            className="w-full bg-carbon-light rounded-xl p-10 flex flex-col items-center justify-center hover:bg-white/[0.07] transition-colors"
          >
            <ScanLine size={64} className="text-orange-accent/40 mb-4" />
            <p className="text-orange-accent text-sm font-medium">扫一扫</p>
            <p className="text-gray-500 text-xs mt-1">点击模拟扫描会员二维码</p>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => { setInputMode('memberId'); setMemberInput(''); setFoundBooking(null) }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'memberId'
                  ? 'bg-white/10 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
            >
              会员ID
            </button>
            <button
              onClick={() => { setInputMode('phone'); setMemberInput(''); setFoundBooking(null) }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'phone'
                  ? 'bg-white/10 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
            >
              手机号
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              placeholder={inputMode === 'memberId' ? '输入会员ID' : '输入手机号'}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-accent transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && foundBooking) handleCheckin()
              }}
            />
            <button
              onClick={handleCheckin}
              disabled={submitting || !foundBooking}
              className="px-6 py-2.5 bg-orange-accent text-white rounded-lg text-sm font-medium hover:bg-orange-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              核销
            </button>
          </div>

          {foundBooking && (
            <div className="bg-carbon-light rounded-xl p-4 flex items-center gap-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-orange-accent/20 flex items-center justify-center text-orange-accent text-base font-bold shrink-0">
                {foundBooking.member_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{foundBooking.member_name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <User size={10} />
                  <span>ID: {foundBooking.member_id}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Phone size={10} />
                  <span>{maskPhone((foundBooking as any).member_phone || '')}</span>
                </div>
              </div>
              {foundBooking.status === 'completed' ? (
                <span className="text-xs text-mint font-medium">已签到</span>
              ) : foundBooking.status === 'booked' ? (
                <span className="text-xs text-orange-accent font-medium">待签到</span>
              ) : (
                <span className="text-xs text-gray-500">{foundBooking.status}</span>
              )}
            </div>
          )}

          {memberInput && !foundBooking && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm bg-danger/10 text-danger">
              <XCircle size={16} />
              <span>未找到该会员的预约记录</span>
            </div>
          )}

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
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone size={10} />
                        <span>{maskPhone((booking as any).member_phone || '')}</span>
                      </div>
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

      {showScanModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-carbon-light rounded-2xl p-6 w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">模拟扫码</h3>
              <button
                onClick={() => { setShowScanModal(false); setScanInput('') }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              输入二维码内容进行模拟扫描。二维码格式: {`{ "memberId": 123, "type": "checkin" }`}
            </p>
            <textarea
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder='输入 JSON 或会员ID，例如：{"memberId": 1, "type": "checkin"}'
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-accent transition-colors resize-none h-24"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowScanModal(false); setScanInput('') }}
                className="flex-1 py-2.5 bg-white/5 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleScanConfirm}
                disabled={!scanInput.trim()}
                className="flex-1 py-2.5 bg-orange-accent text-white rounded-lg text-sm font-medium hover:bg-orange-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认扫描
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
