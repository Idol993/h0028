import type { ClassType } from '@/types'

const CLASS_TYPE_CONFIG: Record<ClassType, { label: string; className: string }> = {
  yoga: {
    label: '瑜伽',
    className: 'bg-class-yoga/15 text-class-yoga',
  },
  boxing: {
    label: '搏击',
    className: 'bg-class-boxing/15 text-class-boxing',
  },
  spinning: {
    label: '动感单车',
    className: 'bg-class-spinning/15 text-class-spinning',
  },
  pilates: {
    label: '普拉提',
    className: 'bg-class-pilates/15 text-class-pilates',
  },
}

interface ClassTypeBadgeProps {
  type: ClassType
}

export default function ClassTypeBadge({ type }: ClassTypeBadgeProps) {
  const config = CLASS_TYPE_CONFIG[type]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
