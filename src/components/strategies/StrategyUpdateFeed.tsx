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
      <div className="text-center py-8 text-[#8a7d6b]">
        <p>No recent updates</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#2a2520]">
      {updates.map((update, index) => (
        <StrategyUpdateItem key={`${update.date}-${index}`} update={update} />
      ))}
    </div>
  )
}
