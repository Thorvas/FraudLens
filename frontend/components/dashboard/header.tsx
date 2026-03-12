'use client'

import { Bell, RefreshCw, Pause, Play, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  isAutoRefresh: boolean
  onToggleAutoRefresh: () => void
  onManualRefresh: () => void
  newAlertsCount: number
  isRefreshing: boolean
}

export function Header({
  isAutoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  newAlertsCount,
  isRefreshing,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Panel Monitoringu</h2>
            <p className="text-xs text-muted-foreground">
              System wykrywania podejrzanych aktywnosci
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isAutoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
            )} />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {isAutoRefresh ? 'Auto-odswiezanie' : 'Wstrzymane'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAutoRefresh}
            className="gap-2"
          >
            {isAutoRefresh ? (
              <>
                <Pause className="h-4 w-4" />
                <span className="hidden sm:inline">Wstrzymaj</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Wznow</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {newAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-medium bg-red-500 text-white rounded-full">
                {newAlertsCount > 9 ? '9+' : newAlertsCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
