import React from 'react'
import { Badge } from '@/components/ui/badge'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: {
    text: string
    variant: 'preview' | 'locked' | 'default'
  }
  actions?: React.ReactNode
}

export function SectionHeader({ title, subtitle, badge, actions }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h2 className="heading-md text-slate-800">{title}</h2>
          {badge && (
            <Badge variant={badge.variant}>{badge.text}</Badge>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-slate-500 text-lg">{subtitle}</p>
      )}
    </div>
  )
}
