'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface SSEEvent {
  type: 'connected' | 'message' | 'typing' | 'heartbeat'
  channelId?: string
  userId?: string
  userName?: string
  isTyping?: boolean
  message?: any
  timestamp: string
}

interface UseSSEOptions {
  channelId: string | null
  onMessage?: (message: any) => void
  onTyping?: (userId: string, userName: string, isTyping: boolean) => void
  onConnected?: () => void
}

export function useSSE({ channelId, onMessage, onTyping, onConnected }: UseSSEOptions) {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (!channelId || !session?.user?.id) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `/api/community/events?channelId=${encodeURIComponent(channelId)}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionError(null)
      onConnected?.()
    }

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            setIsConnected(true)
            setConnectionError(null)
            break
          case 'message':
            if (data.message) {
              onMessage?.(data.message)
            }
            break
          case 'typing':
            if (data.userId && data.userName !== undefined && data.isTyping !== undefined) {
              onTyping?.(data.userId, data.userName, data.isTyping)
            }
            break
          case 'heartbeat':
            // Keep connection alive
            break
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setIsConnected(false)
      setConnectionError('Connection lost. Attempting to reconnect...')
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connect()
        }
      }, 3000)
    }
  }, [channelId, session?.user?.id, onMessage, onTyping, onConnected])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Connect when channelId changes
  useEffect(() => {
    if (channelId) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [channelId, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    connectionError,
    reconnect: connect
  }
}

// Hook for typing indicators
export function useTypingIndicator(channelId: string | null) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timestamp: number }>>(new Map())
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleTyping = useCallback((userId: string, userName: string, isTyping: boolean) => {
    const now = Date.now()
    
    if (isTyping) {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        newMap.set(userId, { name: userName, timestamp: now })
        return newMap
      })

      // Clear existing timeout
      const existingTimeout = typingTimeoutRef.current.get(userId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Set new timeout to remove user from typing after 3 seconds
      const timeout = setTimeout(() => {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          newMap.delete(userId)
          return newMap
        })
        typingTimeoutRef.current.delete(userId)
      }, 3000)

      typingTimeoutRef.current.set(userId, timeout)
    } else {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        newMap.delete(userId)
        return newMap
      })

      const timeout = typingTimeoutRef.current.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        typingTimeoutRef.current.delete(userId)
      }
    }
  }, [])

  const getTypingText = useCallback(() => {
    const users = Array.from(typingUsers.values())
    if (users.length === 0) return null
    if (users.length === 1) return `${users[0].name} is typing...`
    if (users.length === 2) return `${users[0].name} and ${users[1].name} are typing...`
    return `${users[0].name} and ${users.length - 1} others are typing...`
  }, [typingUsers])

  return {
    typingUsers: Array.from(typingUsers.values()),
    typingText: getTypingText(),
    handleTyping
  }
}
