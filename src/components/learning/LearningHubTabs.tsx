'use client'

import { useState } from 'react'
import { BookOpen, GraduationCap, FileText, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'discover' | 'progress'

interface LearningHubTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  stats?: {
    courses: number
    resources: number
  }
}

export function LearningHubTabs({ activeTab, onTabChange, stats }: LearningHubTabsProps) {
  const tabs = [
    {
      id: 'discover' as TabType,
      label: 'Discover',
      icon: BookOpen,
      description: 'Explore all content'
    },
    {
      id: 'progress' as TabType,
      label: 'Progress',
      icon: BarChart3,
      description: 'Analytics & stats'
    }
  ]

  return (
    <div
      data-tour="learning-tabs"
      className="bg-[var(--bg-panel)] rounded-2xl shadow-lg p-2 mb-8 border border-[var(--border-subtle)]"
    >
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap',
                isActive
                  ? 'bg-gold-500 text-white shadow-md'
                  : 'text-[var(--text-strong)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
              {tab.description && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#2a2520] text-[var(--text-strong)]'
                )}>
                  {tab.description}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

