'use client'

import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALERT_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/types'
import type { AlertType, Priority, AlertStatus } from '@/lib/types'

interface AlertFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  priorityFilter: string
  onPriorityChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  onClearFilters: () => void
}

export function AlertFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  priorityFilter,
  onPriorityChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
}: AlertFiltersProps) {
  const hasFilters = search || typeFilter || priorityFilter || statusFilter

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj po nazwie, emailu..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-secondary border-border"
        />
      </div>
      
      <div className="flex gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Typ alertu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            {(Object.entries(ALERT_TYPE_LABELS) as [AlertType, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[140px] bg-secondary border-border">
            <SelectValue placeholder="Priorytet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px] bg-secondary border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {(Object.entries(STATUS_LABELS) as [AlertStatus, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={onClearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
