import type { Alert, BankUser, AlertType, AlertPriority, AlertStatus, DashboardStats } from './types'

const FIRST_NAMES = [
  'Jan', 'Anna', 'Piotr', 'Maria', 'Krzysztof', 'Agnieszka', 'Andrzej', 'Ewa',
  'Tomasz', 'Magdalena', 'Pawel', 'Katarzyna', 'Marcin', 'Barbara', 'Michal',
  'Marta', 'Lukasz', 'Zofia', 'Adam', 'Aleksandra'
]

const LAST_NAMES = [
  'Kowalski', 'Nowak', 'Wisniewski', 'Wojcik', 'Kowalczyk', 'Kaminski', 'Lewandowski',
  'Zielinski', 'Szymanski', 'Wozniak', 'Dabrowski', 'Kozlowski', 'Jankowski', 'Mazur',
  'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawlowski'
]

const CITIES = ['Warszawa', 'Krakow', 'Wroclaw', 'Poznan', 'Gdansk', 'Lodz', 'Szczecin', 'Lublin']

const DEVICES = ['iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Pro', 'Windows PC', 'iPad Pro', 'Android Tablet']

const COUNTRIES = ['Niemcy', 'USA', 'Wielka Brytania', 'Francja', 'Chiny', 'Rosja', 'Nigeria', 'Brazylia']

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysBack: number): string {
  const now = Date.now()
  const msBack = randomInt(0, daysBack * 24 * 60 * 60 * 1000)
  return new Date(now - msBack).toISOString()
}

function generateAccountNumber(): string {
  let acc = 'PL'
  for (let i = 0; i < 26; i++) {
    acc += randomInt(0, 9).toString()
  }
  return acc
}

function generatePhone(): string {
  return `+48 ${randomInt(500, 799)} ${randomInt(100, 999)} ${randomInt(100, 999)}`
}

function generateUsers(count: number): BankUser[] {
  const users: BankUser[] = []
  
  for (let i = 0; i < count; i++) {
    const firstName = randomElement(FIRST_NAMES)
    const lastName = randomElement(LAST_NAMES)
    
    users.push({
      id: `user-${i + 1}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.pl`,
      phone: generatePhone(),
      accountNumber: generateAccountNumber(),
      accountStatus: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'frozen' : 'blocked') : 'active',
      riskScore: randomInt(0, 100),
      lastActivity: randomDate(7),
      alertCount: 0,
    })
  }
  
  return users
}

function generateAlertForType(type: AlertType): Partial<Alert> {
  switch (type) {
    case 'limit_change':
      const oldLimit = randomInt(1000, 5000)
      const newLimit = oldLimit + randomInt(5000, 50000)
      return {
        title: `Zmiana limitu transakcyjnego`,
        description: `Uzytkownik zmienil limit dzienny z ${oldLimit} PLN na ${newLimit} PLN`,
        metadata: {
          oldLimit,
          newLimit,
          changePercentage: Math.round((newLimit / oldLimit - 1) * 100),
        },
        priority: newLimit > 30000 ? 'critical' : newLimit > 15000 ? 'medium' : 'low',
      }
    
    case 'suspicious_transfer':
      const amount = randomInt(5000, 500000)
      const isInternational = Math.random() > 0.5
      return {
        title: isInternational ? `Przelew miedzynarodowy` : `Podejrzany przelew krajowy`,
        description: `Przelew na kwote ${amount.toLocaleString('pl-PL')} PLN ${isInternational ? `do ${randomElement(COUNTRIES)}` : 'na nowe konto'}`,
        metadata: {
          amount,
          currency: 'PLN',
          destination: isInternational ? randomElement(COUNTRIES) : randomElement(CITIES),
          isInternational,
          recipientName: `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`,
        },
        priority: amount > 100000 ? 'critical' : amount > 30000 ? 'medium' : 'low',
      }
    
    case 'new_device_login':
      const device = randomElement(DEVICES)
      const location = Math.random() > 0.7 ? randomElement(COUNTRIES) : randomElement(CITIES)
      const isUnusualLocation = !CITIES.includes(location)
      return {
        title: `Logowanie z nowego urzadzenia`,
        description: `Zalogowano z ${device} w lokalizacji: ${location}`,
        metadata: {
          device,
          location,
          ipAddress: `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
          isUnusualLocation,
        },
        priority: isUnusualLocation ? 'critical' : 'medium',
      }
    
    case 'failed_login_attempts':
      const attempts = randomInt(3, 20)
      return {
        title: `Wielokrotne nieudane logowania`,
        description: `Wykryto ${attempts} nieudanych prob logowania w ciagu ostatniej godziny`,
        metadata: {
          attempts,
          ipAddresses: Array.from({ length: Math.min(attempts, 5) }, () => 
            `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`
          ),
          lastAttempt: new Date().toISOString(),
        },
        priority: attempts > 10 ? 'critical' : attempts > 5 ? 'medium' : 'low',
      }
    
    case 'contact_info_change':
      const changeType = randomElement(['email', 'phone', 'address'])
      return {
        title: `Zmiana danych kontaktowych`,
        description: `Uzytkownik zmienil ${changeType === 'email' ? 'adres email' : changeType === 'phone' ? 'numer telefonu' : 'adres zamieszkania'}`,
        metadata: {
          changeType,
          previousValue: changeType === 'email' ? 'stary@email.pl' : changeType === 'phone' ? '+48 XXX XXX XXX' : 'Poprzedni adres',
          newValue: changeType === 'email' ? 'nowy@email.pl' : changeType === 'phone' ? generatePhone() : `ul. ${randomElement(['Nowa', 'Glowna', 'Parkowa'])} ${randomInt(1, 100)}, ${randomElement(CITIES)}`,
        },
        priority: 'low',
      }
  }
}

function generateAlerts(users: BankUser[], count: number): Alert[] {
  const alerts: Alert[] = []
  const alertTypes: AlertType[] = [
    'limit_change',
    'suspicious_transfer',
    'new_device_login',
    'failed_login_attempts',
    'contact_info_change',
  ]
  const statuses: AlertStatus[] = ['new', 'new', 'new', 'reviewed', 'resolved']

  for (let i = 0; i < count; i++) {
    const user = randomElement(users)
    const type = randomElement(alertTypes)
    const alertData = generateAlertForType(type)
    
    const alert: Alert = {
      id: `alert-${i + 1}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      type,
      priority: alertData.priority as AlertPriority,
      title: alertData.title as string,
      description: alertData.description as string,
      metadata: alertData.metadata as Record<string, unknown>,
      timestamp: randomDate(7),
      status: randomElement(statuses),
    }
    
    alerts.push(alert)
    user.alertCount++
  }

  // Sort by timestamp (newest first)
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  return alerts
}

// Generate mock data once
const { alerts, users } = (() => {
  const users = generateUsers(25)
  const alerts = generateAlerts(users, 60)
  return { alerts, users }
})()

export const MOCK_ALERTS = alerts
export const MOCK_USERS = users

// Helper to generate stats from alerts
export function generateStats(alertList: Alert[]): DashboardStats {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return {
    totalAlerts: alertList.length,
    criticalAlerts: alertList.filter(a => a.priority === 'critical' && a.status === 'new').length,
    blockedAccounts: MOCK_USERS.filter(u => u.accountStatus === 'blocked' || u.accountStatus === 'frozen').length,
    todayAlerts: alertList.filter(a => new Date(a.timestamp) >= today).length,
  }
}

// Helper to generate activity chart data
export function generateActivityData(): { hour: string; count: number }[] {
  const data: { hour: string; count: number }[] = []
  const now = new Date()
  
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now)
    hour.setHours(hour.getHours() - i)
    data.push({
      hour: hour.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      count: randomInt(0, 15),
    })
  }
  
  return data
}
