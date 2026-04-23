'use client'

import { Sun, Moon, Monitor, Palette } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/components/theme-provider'

const options: Array<{
  value: ThemePreference
  label: string
  description: string
  icon: typeof Sun
}> = [
  {
    value: 'dark',
    label: 'Dark',
    description: 'Default brand theme',
    icon: Moon,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Warm ivory palette',
    icon: Sun,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match your device',
    icon: Monitor,
  },
]

export function ThemePreferenceCard() {
  const { preference, setTheme } = useTheme()

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-strong)] mb-1 flex items-center gap-2">
        <Palette className="w-5 h-5 text-[var(--text-muted)]" />
        Appearance
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Choose how the portal looks. Your preference is saved to your account.
      </p>

      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {options.map(opt => {
          const Icon = opt.icon
          const selected = preference === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all ${
                selected
                  ? 'border-[var(--gold-400)] bg-[var(--gold-400)]/10 ring-1 ring-[var(--gold-400)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-hover)] hover:border-[var(--text-muted)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-4 h-4 ${
                    selected ? 'text-[var(--gold-400)]' : 'text-[var(--text-muted)]'
                  }`}
                />
                <span className="text-sm font-semibold text-[var(--text-strong)]">
                  {opt.label}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {opt.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
