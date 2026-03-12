export type AlertType =
  | 'limit_change'
  | 'suspicious_transfer'
  | 'new_device_login'
  | 'failed_login_attempts'
  | 'contact_info_change'

export type AlertPriority = 'low' | 'medium' | 'critical'

export type AlertStatus = 'new' | 'reviewed' | 'resolved' | 'escalated'

export type AccountStatus = 'active' | 'frozen' | 'blocked'

export interface Alert {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: AlertType
  priority: AlertPriority
  title: string
  description: string
  metadata: Record<string, unknown>
  timestamp: string
  status: AlertStatus
  resolvedAt?: string
  assignedTo?: string
}

export interface BankUser {
  id: string
  name: string
  email: string
  phone: string
  accountNumber: string
  accountStatus: AccountStatus
  riskScore: number
  lastActivity: string
  alertCount: number
  alerts?: Alert[]
}

export interface DashboardStats {
  totalAlerts: number
  criticalAlerts: number
  blockedAccounts: number
  todayAlerts: number
}

export interface EventPayload {
  userId: string
  eventType: AlertType
  data: Record<string, unknown>
}

export interface ActionPayload {
  action: 'freeze' | 'block' | 'unblock' | 'send_sms'
  message?: string
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  limit_change: 'Zmiana limitow',
  suspicious_transfer: 'Podejrzany przelew',
  new_device_login: 'Nowe urzadzenie',
  failed_login_attempts: 'Nieudane logowania',
  contact_info_change: 'Zmiana danych',
}

export const PRIORITY_LABELS: Record<AlertPriority, string> = {
  low: 'Niski',
  medium: 'Sredni',
  critical: 'Krytyczny',
}

export const STATUS_LABELS: Record<AlertStatus, string> = {
  new: 'Nowy',
  reviewed: 'Przegladany',
  resolved: 'Rozwiazany',
  escalated: 'Eskalowany',
}
