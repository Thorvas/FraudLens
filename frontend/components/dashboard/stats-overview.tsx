'use client'

import { AlertTriangle, Shield, UserX, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatsOverviewProps {
  totalAlerts: number
  criticalAlerts: number
  blockedAccounts: number
  todayAlerts: number
}

export function StatsOverview({
  totalAlerts,
  criticalAlerts,
  blockedAccounts,
  todayAlerts,
}: StatsOverviewProps) {
  const stats = [
    {
      label: 'Wszystkie alerty',
      value: totalAlerts,
      icon: Shield,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Alerty krytyczne',
      value: criticalAlerts,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      highlight: criticalAlerts > 0,
    },
    {
      label: 'Zablokowane konta',
      value: blockedAccounts,
      icon: UserX,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Alerty dzisiaj',
      value: todayAlerts,
      icon: Clock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`border-border/50 ${stat.highlight ? 'ring-1 ring-red-500/50' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
