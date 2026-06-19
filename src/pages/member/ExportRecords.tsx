import { useState, useEffect } from 'react'
import { FileDown } from 'lucide-react'
import { apiGet } from '@/lib/api'
import ClassTypeBadge from '@/components/ClassTypeBadge'
import StatusBadge from '@/components/StatusBadge'
import type { Booking } from '@/types'

export default function ExportRecords() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [records, setRecords] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!fromDate || !toDate) {
      setRecords([])
      return
    }
    async function fetch() {
      try {
        setLoading(true)
        const data = await apiGet<Booking[]>(
          `/api/bookings/my?from=${fromDate}&to=${toDate}`
        )
        setRecords(data)
      } catch {
        setRecords([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [fromDate, toDate])

  const handleExport = async () => {
    if (!fromDate || !toDate) return
    try {
      setExporting(true)
      const token = localStorage.getItem('token')
      const res = await fetch(
        `/api/members/my/records/export?from=${fromDate}&to=${toDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) throw new Error('导出失败')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `预约记录_${fromDate}_${toDate}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {} finally {
      setExporting(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <h2 className="text-white font-bold text-lg mb-6">导出预约记录</h2>

      <div className="bg-carbon rounded-2xl p-6 border border-white/5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-gray-400 text-sm mb-2">开始日期</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-carbon-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-accent/50 transition-colors"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-gray-400 text-sm mb-2">结束日期</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-carbon-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-accent/50 transition-colors"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={!fromDate || !toDate || exporting || records.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-accent to-[#ff8f5e] text-white text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            <FileDown size={16} />
            {exporting ? '导出中...' : '导出 CSV'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-orange-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fromDate && toDate && records.length > 0 ? (
        <div className="bg-carbon rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">课程</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">类型</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">日期</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">时间</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">教练</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 last:border-b-0">
                    <td className="px-5 py-3 text-white">{record.class_info?.name || '-'}</td>
                    <td className="px-5 py-3">
                      {record.class_info && <ClassTypeBadge type={record.class_info.type} />}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{record.class_info?.date || '-'}</td>
                    <td className="px-5 py-3 text-gray-300">
                      {record.class_info
                        ? `${record.class_info.start_time}-${record.class_info.end_time}`
                        : '-'}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{record.class_info?.coach_name || '-'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : fromDate && toDate ? (
        <div className="text-center text-gray-500 py-10">所选日期范围内暂无记录</div>
      ) : (
        <div className="text-center text-gray-500 py-10">请选择日期范围以预览记录</div>
      )}
    </div>
  )
}
