import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function MemberQRCode() {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [timestamp, setTimestamp] = useState(Date.now())
  const user = useAuthStore((s) => s.user)

  const generateQR = useCallback(async () => {
    if (!user) return
    const payload = JSON.stringify({ memberId: user.id, type: 'checkin', timestamp })
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        color: { dark: '#1A1A2E', light: '#FFFFFF' },
      })
      setQrDataUrl(url)
    } catch {}
  }, [user, timestamp])

  useEffect(() => {
    generateQR()
  }, [generateQR])

  const handleRefresh = () => {
    setTimestamp(Date.now())
  }

  if (!user) return null

  return (
    <div className="animate-fadeIn flex flex-col items-center pt-8">
      <div className="bg-carbon rounded-2xl p-8 border-2 border-orange-accent/30 flex flex-col items-center w-full max-w-sm">
        <h2 className="text-white font-bold text-lg mb-6">签到二维码</h2>

        <div className="bg-white rounded-xl p-4 mb-6">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-[260px] h-[260px]" />
          ) : (
            <div className="w-[260px] h-[260px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="text-center mb-4">
          <div className="text-white font-bold text-lg">{user.name}</div>
          <div className="text-gray-400 text-sm mt-1">{user.phone}</div>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-orange-accent/15 rounded-lg">
            <span className="text-orange-accent text-xs font-medium">会员ID</span>
            <span className="text-orange-accent text-sm font-bold">{user.id}</span>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-accent/15 text-orange-accent text-sm hover:bg-orange-accent/25 transition-colors"
        >
          <RefreshCw size={16} />
          刷新二维码
        </button>
      </div>

      <p className="text-gray-500 text-sm mt-6 text-center">
        请向前台或教练出示此二维码进行签到
      </p>
    </div>
  )
}
