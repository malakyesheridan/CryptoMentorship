'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

interface LearningProgressEvent {
  type: 'progress_update' | 'track_progress' | 'achievement' | 'connected' | 'heartbeat'
  lessonId?: string
  trackId?: string
  progressPct?: number
  completedAt?: string
  timeSpentMs?: number
  achievement?: {
    type: 'lesson_completed' | 'track_completed' | 'streak_milestone' | 'certificate_earned'
    title: string
    description: string
    icon?: string
  }
  userId?: string
  timestamp: string
}

interface UseLearningSSEOptions {
  trackId?: string
  type?: 'user' | 'track'
  onProgressUpdate?: (event: LearningProgressEvent) => void
  onTrackProgress?: (event: LearningProgressEvent) => void
  onAchievement?: (event: LearningProgressEvent) => void
  onConnected?: () => void
}

export function useLearningSSE({ 
  trackId, 
  type = 'user', 
  onProgressUpdate, 
  onTrackProgress, 
  onAchievement, 
  onConnected 
}: UseLearningSSEOptions) {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (!session?.user?.id) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const params = new URLSearchParams()
    if (trackId) params.set('trackId', trackId)
    params.set('type', type)

    const url = `/api/learning/events?${params.toString()}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionError(null)
      onConnected?.()
    }

    eventSource.onmessage = (event) => {
      try {
        const data: LearningProgressEvent = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            setIsConnected(true)
            setConnectionError(null)
            break
          case 'progress_update':
            if (data.lessonId && data.progressPct !== undefined) {
              onProgressUpdate?.(data)
            }
            break
          case 'track_progress':
            if (data.trackId && data.progressPct !== undefined) {
              onTrackProgress?.(data)
            }
            break
          case 'achievement':
            if (data.achievement) {
              onAchievement?.(data)
            }
            break
          case 'heartbeat':
            // Keep connection alive
            break
        }
      } catch (error) {
        console.error('Error parsing learning SSE event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Learning SSE connection error:', error)
      setIsConnected(false)
      setConnectionError('Connection lost. Attempting to reconnect...')
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connect()
        }
      }, 3000)
    }
  }, [session?.user?.id, trackId, type, onProgressUpdate, onTrackProgress, onAchievement, onConnected])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
    setConnectionError(null)
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect
  }
}
