'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react'

type TabType = 'open' | 'closed' | 'performance' | 'analytics'

interface PortfolioTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  stats?: {
    openTrades: number
    closedTrades: number
  }
}

export function PortfolioTabs({ activeTab, onTabChange, stats }: PortfolioTabsProps) {
  const tabs = [
    { 
      id: 'open' as TabType, 
      name: `Holdings${stats ? ` (${stats.openTrades})` : ''}`, 
      icon: TrendingUp 
    },
    { 
      id: 'closed' as TabType, 
      name: `Realized${stats ? ` (${stats.closedTrades})` : ''}`, 
      icon: TrendingDown 
    },
    { 
      id: 'performance' as TabType, 
      name: 'Performance', 
      icon: BarChart3 
    },
    { 
      id: 'analytics' as TabType, 
      name: 'Analytics', 
      icon: PieChart 
    },
  ]

  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'rounded-xl px-6 py-3 font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-gold-500 text-white shadow-md hover:bg-gold-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.name}
          </Button>
        ))}
      </div>
    </div>
  )
}

