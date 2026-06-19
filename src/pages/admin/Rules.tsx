import { useState, useEffect, useCallback } from 'react'
import { Settings, Check } from 'lucide-react'
import { apiGet, apiPut } from '@/lib/api'
import type { Rules } from '@/types'

export default function RulesPage() {
  const [noShowThreshold, setNoShowThreshold] = useState(3)
  const [suspendWeeks, setSuspendWeeks] = useState(1)
  const [cancelHoursBefore, setCancelHoursBefore] = useState(2)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet<Rules>('/api/rules')
      setNoShowThreshold(res.no_show_threshold)
      setSuspendWeeks(res.suspend_weeks)
      setCancelHoursBefore(res.cancel_hours_before)
    } catch {
      setMessage({ type: 'error', text: '获取规则设置失败' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      await apiPut('/api/rules', {
        no_show_threshold: noShowThreshold,
        suspend_weeks: suspendWeeks,
        cancel_hours_before: cancelHoursBefore,
      })
      setMessage({ type: 'success', text: '规则设置已保存' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={28} className="text-orange-accent" />
        <h1 className="font-outfit font-bold text-2xl text-white">规则设置</h1>
      </div>

      <div className="bg-carbon rounded-xl border border-white/5 p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">爽约次数阈值</label>
            <input
              type="number"
              min={1}
              value={noShowThreshold}
              onChange={e => setNoShowThreshold(Number(e.target.value))}
              className="w-32 bg-carbon-light border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
            />
            <p className="text-gray-500 text-sm mt-1">当月爽约达到此次数将暂停预约权限</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">暂停预约周数</label>
            <input
              type="number"
              min={1}
              value={suspendWeeks}
              onChange={e => setSuspendWeeks(Number(e.target.value))}
              className="w-32 bg-carbon-light border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
            />
            <p className="text-gray-500 text-sm mt-1">爽约达标后暂停预约的周数</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">取消截止时间(小时)</label>
            <input
              type="number"
              min={0}
              value={cancelHoursBefore}
              onChange={e => setCancelHoursBefore(Number(e.target.value))}
              className="w-32 bg-carbon-light border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-accent/50"
            />
            <p className="text-gray-500 text-sm mt-1">开课前多少小时内不可取消预约</p>
          </div>
        </div>

        {message && (
          <div className={`mt-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-mint/10 border border-mint/30 text-mint'
              : 'bg-danger/10 border border-danger/30 text-danger'
          }`}>
            {message.type === 'success' && <Check size={16} />}
            {message.text}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-accent hover:bg-orange-accent/90 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  )
}
