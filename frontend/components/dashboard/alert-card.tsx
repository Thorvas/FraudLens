'use client'

import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { MoreHorizontal, User, Mail, CheckCircle, Eye, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PriorityBadge } from './priority-badge'
import { AlertTypeIcon } from './alert-type-icon'
import type { Alert, AlertStatus } from '@/lib/types'
import { ALERT_TYPE_LABELS, STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AlertCardProps {
  alert: Alert
  onViewUser: (userId: string) => void
  onUpdateStatus: (alertId: string, status: AlertStatus) => void
}

export function AlertCard({ alert, onViewUser, onUpdateStatus }: AlertCardProps) {
  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), {
    addSuffix: true,
    locale: pl,
  })

  return (
    <Card
      className={cn(
        'border-border/50 transition-all hover:border-border',
        alert.status === 'new' && alert.priority === 'critical' && 'border-l-2 border-l-red-500',
        alert.status === 'resolved' && 'opacity-60'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <AlertTypeIcon type={alert.type} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-foreground">{alert.title}</h3>
                  <PriorityBadge priority={alert.priority} />
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    {
                      'bg-blue-500/20 text-blue-400': alert.status === 'new',
                      'bg-amber-500/20 text-amber-400': alert.status === 'reviewed',
                      'bg-emerald-500/20 text-emerald-400': alert.status === 'resolved',
                      'bg-red-500/20 text-red-400': alert.status === 'escalated',
                    }
                  )}>
                    {STATUS_LABELS[alert.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewUser(alert.userId)}>
                    <User className="h-4 w-4 mr-2" />
                    Zobacz uzytkownika
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onUpdateStatus(alert.id, 'reviewed')}>
                    <Eye className="h-4 w-4 mr-2" />
                    Oznacz jako przegladane
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(alert.id, 'resolved')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Oznacz jako rozwiazane
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateStatus(alert.id, 'escalated')}
                    className="text-red-400"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Eskaluj
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {alert.userName}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {alert.userEmail}
              </span>
              <span className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground">
                {ALERT_TYPE_LABELS[alert.type]}
              </span>
              <span className="ml-auto">{timeAgo}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
