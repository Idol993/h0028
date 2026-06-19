import type { BookingStatus } from '@/types'

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  booked: {
    label: '已预约',
    className: 'bg-blue-500/15 text-blue-400',
  },
  cancelled: {
    label: '已取消',
    className: 'bg-gray-500/15 text-gray-400',
  },
  completed: {
    label: '已完成',
    className: 'bg-mint/15 text-mint',
  },
  no_show: {
    label: '缺席',
    className: 'bg-danger/15 text-danger',
  },
}

interface StatusBadgeProps {
  status: BookingStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
