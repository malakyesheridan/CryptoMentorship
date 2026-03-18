'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

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

export function CryptoCompassTabs({ activeCategory, onCategoryChange, counts }: CryptoCompassTabsProps) {
  const categories = [
    {
      id: 'all' as CategoryType,
      name: `All Episodes${counts ? ` (${counts.all})` : ''}`,
      icon: Calendar
    }
  ]

  return (
    <div className="flex justify-center mb-8">
      <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg p-2 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'default' : 'ghost'}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'rounded-xl px-6 py-3 font-medium transition-all duration-200',
              activeCategory === category.id
                ? 'bg-gold-500 text-white shadow-md hover:bg-gold-600'
                : 'text-[var(--text-strong)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
            )}
          >
            <category.icon className="h-4 w-4 mr-2" />
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  )
}

