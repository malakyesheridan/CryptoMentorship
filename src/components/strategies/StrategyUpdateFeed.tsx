import { StrategyUpdateItem } from './StrategyUpdateItem'

interface StrategyUpdate {
  date: string
  updateType: string
  fromState?: string | null
  toState?: string | null
  commentaryText?: string | null
}

interface StrategyUpdateFeedProps {
  updates: StrategyUpdate[]
}

export function StrategyUpdateFeed({ updates }: StrategyUpdateFeedProps) {
  if (!updates || updates.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <p>No recent updates</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {updates.map((update, index) => (
        <StrategyUpdateItem key={`${update.date}-${index}`} update={update} />
      ))}
    </div>
  )
}
