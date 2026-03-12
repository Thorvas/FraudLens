'use client'

import { 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  Settings,
  Shield,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  activeView: string
  onViewChange: (view: string) => void
  criticalCount: number
}

export function SidebarNav({ activeView, onViewChange, criticalCount }: SidebarNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerty', icon: AlertTriangle, badge: criticalCount },
    { id: 'users', label: 'Uzytkownicy', icon: Users },
    { id: 'notifications', label: 'Powiadomienia', icon: Bell },
    { id: 'settings', label: 'Ustawienia', icon: Settings },
  ]

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border p-4 hidden lg:block">
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="p-2 bg-primary rounded-lg">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-sidebar-foreground">SecureBank</h1>
          <p className="text-xs text-sidebar-foreground/60">Monitoring Panel</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              activeView === item.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
