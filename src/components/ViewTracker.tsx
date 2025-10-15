'use client'

import { useEffect, useRef } from 'react'

import { recordView } from '@/lib/actions/activity'

interface ViewTrackerProps {
  entityType: 'content' | 'episode' | 'signal' | 'resource' | 'lesson'
  entityId: string
  disabled?: boolean
}

export function ViewTracker({ entityType, entityId, disabled }: ViewTrackerProps) {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (disabled) {
      return
    }

    timerRef.current = window.setTimeout(() => {
      recordView({ entityType, entityId }).catch(() => {
        // best effort – ignore client errors
      })
    }, 150)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [disabled, entityId, entityType])

  return null
}
