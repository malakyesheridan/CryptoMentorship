'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, TrendingUp, BarChart3, Layers } from 'lucide-react'

export type CategoryType = 'all' | 'daily-update' | 'analysis' | 'breakdown'

interface CryptoCompassTabsProps {
  activeCategory: CategoryType
  onCategoryChange: (category: CategoryType) => void
  counts?: {
    all: number
    dailyUpdate: number
    analysis: number
    breakdown: number
  }
}

const categories: { id: CategoryType; name: string; icon: typeof Calendar; color: string }[] = [
  { id: 'all', name: 'All', icon: Layers, color: 'bg-gold-500 text-white hover:bg-gold-600' },
  { id: 'daily-update', name: 'Weekly Updates', icon: Calendar, color: 'bg-blue-600 text-white hover:bg-blue-700' },
  { id: 'analysis', name: 'Analysis', icon: TrendingUp, color: 'bg-purple-600 text-white hover:bg-purple-700' },
  { id: 'breakdown', name: 'Breakdown', icon: BarChart3, color: 'bg-green-600 text-white hover:bg-green-700' },
]

function getCount(id: CategoryType, counts?: CryptoCompassTabsProps['counts']): number | undefined {
  if (!counts) return undefined
  switch (id) {
    case 'all': return counts.all
    case 'daily-update': return counts.dailyUpdate
    case 'analysis': return counts.analysis
    case 'breakdown': return counts.breakdown
  }
}

export function CryptoCompassTabs({ activeCategory, onCategoryChange, counts }: CryptoCompassTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const count = getCount(cat.id, counts)
        const isActive = activeCategory === cat.id
        return (
          <Button
            key={cat.id}
            variant={isActive ? 'default' : 'ghost'}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'rounded-lg px-4 py-2 font-medium transition-all duration-200 text-sm',
              isActive
                ? `${cat.color} shadow-md`
                : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
            )}
          >
            <cat.icon className="h-4 w-4 mr-1.5" />
            {cat.name}
            {count !== undefined && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-white/20' : 'bg-[var(--border-subtle)]'
              )}>
                {count}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
