import { cn } from '@/lib/utils'

interface MetricProps {
  label: string
  value: string
  note?: string
  className?: string
}

export function Metric({ label, value, note, className }: MetricProps) {
  return (
    <div className={cn('inline-block bg-white border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm', className)}>
      <div className="text-sm text-[var(--text-muted)] font-medium mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-[var(--text-strong)] mb-1">
        {value}
      </div>
      {note && (
        <div className="text-xs text-[var(--text-muted)]">
          {note}
        </div>
      )}
    </div>
  )
}
