'use client'

import { useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  AlertTriangle,
  Snowflake,
  Lock,
  Unlock,
  MessageSquare,
  X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { BankUser, Alert } from '@/lib/types'
import { AlertCard } from './alert-card'

interface UserDetailModalProps {
  user: BankUser | null
  alerts: Alert[]
  open: boolean
  onClose: () => void
  onAction: (userId: string, action: 'freeze' | 'block' | 'unblock' | 'send_sms', message?: string) => Promise<void>
  onUpdateAlertStatus: (alertId: string, status: 'new' | 'reviewed' | 'resolved' | 'escalated') => void
}

export function UserDetailModal({
  user,
  alerts,
  open,
  onClose,
  onAction,
  onUpdateAlertStatus,
}: UserDetailModalProps) {
  const [smsMessage, setSmsMessage] = useState('')
  const [showSmsInput, setShowSmsInput] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleAction = async (action: 'freeze' | 'block' | 'unblock' | 'send_sms') => {
    setLoading(true)
    try {
      await onAction(user.id, action, action === 'send_sms' ? smsMessage : undefined)
      if (action === 'send_sms') {
        setShowSmsInput(false)
        setSmsMessage('')
      }
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const getStatusBadge = () => {
    switch (user.accountStatus) {
      case 'frozen':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Snowflake className="h-3 w-3" />
            Zamrozone
          </span>
        )
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            <Lock className="h-3 w-3" />
            Zablokowane
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Unlock className="h-3 w-3" />
            Aktywne
          </span>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              {user.name}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{user.accountNumber}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status konta</span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Liczba alertow</span>
                <span className="flex items-center gap-1 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  {user.alertCount}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Score */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Wskaznik ryzyka</span>
                <span className={cn(
                  'text-lg font-bold',
                  user.riskScore >= 70 ? 'text-red-400' : user.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'
                )}>
                  {user.riskScore}/100
                </span>
              </div>
              <Progress 
                value={user.riskScore} 
                className="h-2"
              />
              <div className={cn('h-2 rounded-full -mt-2', getRiskColor(user.riskScore))} style={{ width: `${user.riskScore}%` }} />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {user.accountStatus === 'active' && (
              <>
                <Button
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => handleAction('freeze')}
                  disabled={loading}
                >
                  <Snowflake className="h-4 w-4 mr-2" />
                  Zamroz konto
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleAction('block')}
                  disabled={loading}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Zablokuj konto
                </Button>
              </>
            )}
            {(user.accountStatus === 'frozen' || user.accountStatus === 'blocked') && (
              <Button
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => handleAction('unblock')}
                disabled={loading}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Odblokuj konto
              </Button>
            )}
            <Button
              variant="outline"
              className="border-primary/50"
              onClick={() => setShowSmsInput(!showSmsInput)}
              disabled={loading}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Wyslij SMS
            </Button>
          </div>

          {/* SMS Input */}
          {showSmsInput && (
            <div className="space-y-2">
              <Textarea
                placeholder="Tresc wiadomosci SMS..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="bg-secondary border-border"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowSmsInput(false)}>
                  Anuluj
                </Button>
                <Button onClick={() => handleAction('send_sms')} disabled={loading || !smsMessage}>
                  Wyslij
                </Button>
              </div>
            </div>
          )}

          {/* User Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Ostatnie alerty ({alerts.length})
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onViewUser={() => {}}
                    onUpdateStatus={onUpdateAlertStatus}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
