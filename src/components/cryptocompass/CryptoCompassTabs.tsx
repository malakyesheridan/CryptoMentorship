'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, BarChart3, TrendingUp } from 'lucide-react'

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
    },
    { 
      id: 'daily-update' as CategoryType, 
      name: `Daily Update${counts ? ` (${counts.dailyUpdate})` : ''}`, 
      icon: Calendar 
    },
    { 
      id: 'analysis' as CategoryType, 
      name: `Analysis${counts ? ` (${counts.analysis})` : ''}`, 
      icon: BarChart3 
    },
    { 
      id: 'breakdown' as CategoryType, 
      name: `Breakdown${counts ? ` (${counts.breakdown})` : ''}`, 
      icon: TrendingUp 
    },
  ]

  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'default' : 'ghost'}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'rounded-xl px-6 py-3 font-medium transition-all duration-200',
              activeCategory === category.id
                ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

