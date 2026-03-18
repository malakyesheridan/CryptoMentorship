'use client'

import { PostCategory } from '@prisma/client'
import { CATEGORY_LABELS } from '@/lib/community/constants'

interface CategoryTabsProps {
  active: PostCategory | null
  onChange: (category: PostCategory | null) => void
}

const tabs: { value: PostCategory | null; label: string }[] = [
  { value: null, label: 'All' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value: value as PostCategory,
    label,
  })),
]

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.value ?? 'all'}
          onClick={() => onChange(tab.value)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === tab.value
              ? 'bg-[var(--gold-400)] text-[#0a0a0a]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
