'use client'

import { useState } from 'react'
import { BookOpen, GraduationCap, FileText, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'discover' | 'courses' | 'resources' | 'progress'

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
      id: 'courses' as TabType,
      label: 'Learning Tracks',
      icon: GraduationCap,
      description: stats?.courses ? `${stats.courses} enrolled` : undefined
    },
    {
      id: 'resources' as TabType,
      label: 'Resources',
      icon: FileText,
      description: stats?.resources ? `${stats.resources} available` : undefined
    },
    {
      id: 'progress' as TabType,
      label: 'Progress',
      icon: BarChart3,
      description: 'Analytics & stats'
    }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 border border-slate-200">
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
                  ? 'bg-yellow-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
              {tab.description && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600'
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

