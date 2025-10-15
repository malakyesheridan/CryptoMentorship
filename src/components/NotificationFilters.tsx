'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface NotificationFiltersProps {
  currentFilter: string
}

export function NotificationFilters({ currentFilter }: NotificationFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters = [
    { key: 'all', label: 'All', count: null },
    { key: 'unread', label: 'Unread', count: null },
    { key: 'mentions', label: 'Mentions', count: null },
    { key: 'content', label: 'Content', count: null },
  ]

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', filter)
    }
    params.delete('cursor') // Reset pagination when changing filters
    router.push(`/notifications?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-slate-500" />
      <span className="text-sm text-slate-600 mr-2">Filter:</span>
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={currentFilter === filter.key ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange(filter.key)}
          className={`${
            currentFilter === filter.key 
              ? 'bg-gold-500 hover:bg-gold-600 text-white' 
              : 'text-slate-600 hover:text-slate-700'
          }`}
        >
          {filter.label}
          {filter.count !== null && (
            <Badge 
              variant="secondary" 
              className="ml-2 text-xs"
            >
              {filter.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  )
}
