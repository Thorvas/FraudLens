/**
 * API Service - Serwis do komunikacji z backendem
 * 
 * INSTRUKCJA INTEGRACJI:
 * 1. Ustaw BASE_URL na adres Twojego backendu
 * 2. Dostosuj endpointy do swojej struktury API
 * 3. Dodaj autoryzację jeśli wymagana (np. Bearer token)
 */

import type { Alert, BankUser, DashboardStats, AlertStatus, AlertType, AlertPriority } from './types'
import { MOCK_ALERTS, MOCK_USERS, generateActivityData, generateStats } from './mock-data'

// ============================================
// KONFIGURACJA - ZMIEŃ NA SWÓJ BACKEND
// ============================================
const BASE_URL = '' // np. 'https://api.twojbank.pl/v1'
const USE_MOCK_DATA = true // Ustaw na false gdy podłączysz backend

// Opcjonalna funkcja do dodawania nagłówków autoryzacji
function getAuthHeaders(): HeadersInit {
  // const token = localStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    // 'Authorization': `Bearer ${token}`,
  }
}

// ============================================
// TYPY FILTRÓW
// ============================================
export interface AlertFilters {
  type?: AlertType | 'all'
  priority?: AlertPriority | 'all'
  status?: AlertStatus | 'all'
  search?: string
}

// ============================================
// FUNKCJE API - ALERTY
// ============================================

export async function fetchAlerts(filters?: AlertFilters): Promise<Alert[]> {
  if (USE_MOCK_DATA) {
    let alerts = [...MOCK_ALERTS]
    
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        alerts = alerts.filter(a => a.type === filters.type)
      }
      if (filters.priority && filters.priority !== 'all') {
        alerts = alerts.filter(a => a.priority === filters.priority)
      }
      if (filters.status && filters.status !== 'all') {
        alerts = alerts.filter(a => a.status === filters.status)
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        alerts = alerts.filter(a => 
          a.userName.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search)
        )
      }
    }
    
    return alerts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  const params = new URLSearchParams()
  if (filters?.type && filters.type !== 'all') params.set('type', filters.type)
  if (filters?.priority && filters.priority !== 'all') params.set('priority', filters.priority)
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)

  const response = await fetch(`${BASE_URL}/alerts?${params}`, {
    headers: getAuthHeaders(),
  })
  
  if (!response.ok) throw new Error('Błąd pobierania alertów')
  return response.json()
}

export async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<Alert> {
  if (USE_MOCK_DATA) {
    const alert = MOCK_ALERTS.find(a => a.id === alertId)
    if (alert) {
      alert.status = status
      if (status === 'resolved') {
        alert.resolvedAt = new Date().toISOString()
      }
    }
    return alert!
  }

  const response = await fetch(`${BASE_URL}/alerts/${alertId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
  
  if (!response.ok) throw new Error('Błąd aktualizacji alertu')
  return response.json()
}

// ============================================
// FUNKCJE API - STATYSTYKI
// ============================================

export async function fetchStats(): Promise<DashboardStats> {
  if (USE_MOCK_DATA) {
    return generateStats(MOCK_ALERTS)
  }

  const response = await fetch(`${BASE_URL}/stats`, {
    headers: getAuthHeaders(),
  })
  
  if (!response.ok) throw new Error('Błąd pobierania statystyk')
  return response.json()
}

export async function fetchActivityData(): Promise<{ hour: string; count: number }[]> {
  if (USE_MOCK_DATA) {
    return generateActivityData()
  }

  const response = await fetch(`${BASE_URL}/stats/activity`, {
    headers: getAuthHeaders(),
  })
  
  if (!response.ok) throw new Error('Błąd pobierania danych aktywności')
  return response.json()
}

// ============================================
// FUNKCJE API - UŻYTKOWNICY
// ============================================

export async function fetchUser(userId: string): Promise<BankUser | null> {
  if (USE_MOCK_DATA) {
    const user = MOCK_USERS.find(u => u.id === userId)
    if (user) {
      const userAlerts = MOCK_ALERTS.filter(a => a.userId === userId)
      return { ...user, alerts: userAlerts }
    }
    return null
  }

  const response = await fetch(`${BASE_URL}/users/${userId}`, {
    headers: getAuthHeaders(),
  })
  
  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error('Błąd pobierania użytkownika')
  }
  return response.json()
}

// ============================================
// FUNKCJE API - AKCJE NA KONTACH
// ============================================

export type UserAction = 'freeze_account' | 'block_account' | 'unblock_account' | 'send_sms'

export interface ActionResult {
  success: boolean
  message: string
}

export async function executeUserAction(
  userId: string, 
  action: UserAction,
  smsMessage?: string
): Promise<ActionResult> {
  if (USE_MOCK_DATA) {
    const user = MOCK_USERS.find(u => u.id === userId)
    if (!user) return { success: false, message: 'Użytkownik nie znaleziony' }

    const messages: Record<UserAction, string> = {
      freeze_account: `Konto użytkownika ${user.name} zostało zamrożone`,
      block_account: `Konto użytkownika ${user.name} zostało zablokowane`,
      unblock_account: `Konto użytkownika ${user.name} zostało odblokowane`,
      send_sms: `SMS wysłany do użytkownika ${user.name}: "${smsMessage}"`,
    }

    // Symulacja zmiany statusu konta
    if (action === 'freeze_account') user.accountStatus = 'frozen'
    if (action === 'block_account') user.accountStatus = 'blocked'
    if (action === 'unblock_account') user.accountStatus = 'active'

    return { success: true, message: messages[action] }
  }

  const response = await fetch(`${BASE_URL}/users/${userId}/actions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, smsMessage }),
  })
  
  if (!response.ok) throw new Error('Błąd wykonywania akcji')
  return response.json()
}

// ============================================
// HELPER - SWR FETCHER
// ============================================

export const swrFetcher = async (url: string) => {
  const response = await fetch(url, { headers: getAuthHeaders() })
  if (!response.ok) throw new Error('Błąd pobierania danych')
  return response.json()
}
