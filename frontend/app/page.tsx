'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast, Toaster } from 'sonner'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { Header } from '@/components/dashboard/header'
import { StatsOverview } from '@/components/dashboard/stats-overview'
import { AlertFilters } from '@/components/dashboard/alert-filters'
import { AlertCard } from '@/components/dashboard/alert-card'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { UserDetailModal } from '@/components/dashboard/user-detail-modal'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Alert, BankUser, AlertStatus, AlertType, AlertPriority, DashboardStats } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import {
  fetchAlerts,
  fetchStats,
  fetchActivityData,
  fetchUser,
  updateAlertStatus,
  executeUserAction,
  type AlertFilters as ApiAlertFilters,
  type UserAction,
} from '@/lib/api-service'

export default function DashboardPage() {
  const [activeView, setActiveView] = useState('dashboard')
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Data states
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<{ hour: string; count: number }[]>([])
  const [selectedUser, setSelectedUser] = useState<BankUser | null>(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<AlertPriority | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all')
  const [displayLimit, setDisplayLimit] = useState(20)
  
  // User modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch all data
  const loadData = useCallback(async () => {
    const filters: ApiAlertFilters = {
      type: typeFilter,
      priority: priorityFilter,
      status: statusFilter,
      search: search || undefined,
    }
    
    const [alertsData, statsData, activityData] = await Promise.all([
      fetchAlerts(filters),
      fetchStats(),
      fetchActivityData(),
    ])
    
    setAlerts(alertsData)
    setStats(statsData)
    setChartData(activityData)
  }, [typeFilter, priorityFilter, statusFilter, search])

  // Initial load and auto-refresh
  useEffect(() => {
    loadData()
    
    if (isAutoRefresh) {
      const interval = setInterval(loadData, 5000)
      return () => clearInterval(interval)
    }
  }, [loadData, isAutoRefresh])

  // Load user when modal opens
  useEffect(() => {
    if (selectedUserId) {
      fetchUser(selectedUserId).then(setSelectedUser)
    }
  }, [selectedUserId])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
    toast.success('Dane zostaly odswiezone')
  }

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId)
    setModalOpen(true)
  }

  const handleUpdateAlertStatus = async (alertId: string, status: AlertStatus) => {
    await updateAlertStatus(alertId, status)
    await loadData()
    if (selectedUserId) {
      const user = await fetchUser(selectedUserId)
      setSelectedUser(user)
    }
    toast.success(`Status alertu zmieniony na: ${STATUS_LABELS[status]}`)
  }

  const handleUserAction = async (
    userId: string,
    action: 'freeze' | 'block' | 'unblock' | 'send_sms',
    message?: string
  ) => {
    const actionMap: Record<string, UserAction> = {
      freeze: 'freeze_account',
      block: 'block_account',
      unblock: 'unblock_account',
      send_sms: 'send_sms',
    }
    
    const result = await executeUserAction(userId, actionMap[action], message)
    
    if (result.success) {
      const user = await fetchUser(userId)
      setSelectedUser(user)
      await loadData()
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setPriorityFilter('all')
    setStatusFilter('all')
  }

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 20)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedUserId(null)
    setSelectedUser(null)
  }

  const displayedAlerts = alerts.slice(0, displayLimit)
  const hasMore = alerts.length > displayLimit

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster position="top-right" theme="dark" richColors />
      <SidebarNav
        activeView={activeView}
        onViewChange={setActiveView}
        criticalCount={stats?.criticalAlerts || 0}
      />

      <div className="flex-1 flex flex-col">
        <Header
          isAutoRefresh={isAutoRefresh}
          onToggleAutoRefresh={() => setIsAutoRefresh(!isAutoRefresh)}
          onManualRefresh={handleManualRefresh}
          newAlertsCount={stats?.criticalAlerts || 0}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Stats Overview */}
          <StatsOverview
            totalAlerts={stats?.totalAlerts || 0}
            criticalAlerts={stats?.criticalAlerts || 0}
            blockedAccounts={stats?.blockedAccounts || 0}
            todayAlerts={stats?.todayAlerts || 0}
          />

          {/* Activity Chart */}
          {chartData.length > 0 && <ActivityChart data={chartData} />}

          {/* Alerts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Alerty ({alerts.length})
              </h3>
            </div>

            <AlertFilters
              search={search}
              onSearchChange={setSearch}
              typeFilter={typeFilter}
              onTypeChange={(v) => setTypeFilter(v as AlertType | 'all')}
              priorityFilter={priorityFilter}
              onPriorityChange={(v) => setPriorityFilter(v as AlertPriority | 'all')}
              statusFilter={statusFilter}
              onStatusChange={(v) => setStatusFilter(v as AlertStatus | 'all')}
              onClearFilters={handleClearFilters}
            />

            <div className="space-y-3">
              {displayedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onViewUser={handleViewUser}
                  onUpdateStatus={handleUpdateAlertStatus}
                />
              ))}

              {displayedAlerts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Brak alertow spelniajacych kryteria wyszukiwania
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={handleLoadMore}>
                    <Loader2 className="h-4 w-4 mr-2" />
                    Zaladuj wiecej
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        alerts={selectedUser?.alerts || []}
        open={modalOpen}
        onClose={handleCloseModal}
        onAction={handleUserAction}
        onUpdateAlertStatus={handleUpdateAlertStatus}
      />
    </div>
  )
}
