'use client'

import { 
  CreditCard, 
  Send, 
  Smartphone, 
  ShieldAlert, 
  UserCog,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertType } from '@/lib/types'

const ICONS: Record<AlertType, LucideIcon> = {
  limit_change: CreditCard,
  suspicious_transfer: Send,
  new_device_login: Smartphone,
  failed_login_attempts: ShieldAlert,
  contact_info_change: UserCog,
}

const COLORS: Record<AlertType, string> = {
  limit_change: 'text-amber-400 bg-amber-500/10',
  suspicious_transfer: 'text-red-400 bg-red-500/10',
  new_device_login: 'text-blue-400 bg-blue-500/10',
  failed_login_attempts: 'text-red-400 bg-red-500/10',
  contact_info_change: 'text-slate-400 bg-slate-500/10',
}

interface AlertTypeIconProps {
  type: AlertType
  className?: string
}

export function AlertTypeIcon({ type, className }: AlertTypeIconProps) {
  const Icon = ICONS[type]
  
  return (
    <div className={cn('p-2 rounded-lg', COLORS[type], className)}>
      <Icon className="h-5 w-5" />
    </div>
  )
}
