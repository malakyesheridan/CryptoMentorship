'use client'

import { useEffect, useState } from 'react'
import { formatEventTime, getUserTimezone } from '@/lib/timezone'
import { Clock } from 'lucide-react'

interface EventTimeDisplayProps {
  startAt: Date
  endAt: Date
  timezone: string
  showUserTimezone?: boolean
  className?: string
}

export function EventTimeDisplay({ 
  startAt, 
  endAt, 
  timezone, 
  showUserTimezone = true,
  className = '' 
}: EventTimeDisplayProps) {
  const [userTimezone, setUserTimezone] = useState<string>('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (showUserTimezone) {
      setUserTimezone(getUserTimezone())
    }
  }, [showUserTimezone])

  if (!isClient) {
    // Server-side fallback
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className="h-4 w-4 text-[var(--text-muted)]" />
        <div>
          <p className="text-sm font-medium text-[var(--text-strong)]">
            {formatEventTime(startAt, timezone, 'PPp')}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  const eventStart = formatEventTime(startAt, timezone, 'PPp')
  const eventEnd = formatEventTime(endAt, timezone, 'pp')
  
  const userStart = showUserTimezone && userTimezone && userTimezone !== timezone 
    ? formatEventTime(startAt, userTimezone, 'PPp')
    : null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4 text-[var(--text-muted)]" />
      <div>
        <p className="text-sm font-medium text-[var(--text-strong)]">
          {eventStart}
        </p>
        <div className="text-xs text-[var(--text-muted)]">
          <span>{timezone} time</span>
          {userStart && (
            <span className="ml-2">
              • {userStart} ({userTimezone})
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Duration: {Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60))} minutes
        </p>
      </div>
    </div>
  )
}
