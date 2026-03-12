'use client'

import { cn } from '@/lib/utils'
import type { AlertPriority } from '@/lib/types'
import { PRIORITY_LABELS } from '@/lib/types'

interface PriorityBadgeProps {
  priority: AlertPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-red-500/20 text-red-400 border border-red-500/30': priority === 'critical',
          'bg-amber-500/20 text-amber-400 border border-amber-500/30': priority === 'medium',
          'bg-blue-500/20 text-blue-400 border border-blue-500/30': priority === 'low',
        },
        className
      )}
    >
      {priority === 'critical' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 animate-pulse" />
      )}
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
