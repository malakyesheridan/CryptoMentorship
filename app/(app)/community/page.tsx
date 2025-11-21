'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'

// Client component - no server-side caching needed
import useSWR from 'swr'
import { useSession } from 'next-auth/react'

import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'
import { ChannelAdminControls } from '@/components/community/ChannelAdminControls'
import { json } from '@/lib/http'
import { useSSE, useTypingIndicator } from '@/hooks/useSSE'
import { toast } from 'sonner'
import type {
  Channel,
  ChatMessage,
  ListChannelsResponse,
  ListMessagesResponse,
  CreateMessageResponse,
} from '@/lib/community/types'

const channelsKey = '/api/channels-minimal'
const messagesKey = (channelId: string | null) =>
  channelId ? `/api/community/messages?channelId=${encodeURIComponent(channelId)}` : null

function useChannels() {
  const { data, error, isLoading, mutate } = useSWR<ListChannelsResponse>(channelsKey, (key) => json<ListChannelsResponse>(key), {
    revalidateOnFocus: false, // Channels don't change frequently
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
  })

  return {
    channels: data?.items ?? [],
    error,
    isLoading,
    refresh: mutate,
  }
}

function useChannelMessages(channelId: string | null) {
  const key = messagesKey(channelId)
  const { data, error, isLoading, mutate } = useSWR<ListMessagesResponse>(
    key,
    key ? (url) => json<ListMessagesResponse>(url) : null,
    {
      revalidateOnFocus: false, // Disable - SSE handles real-time updates
      revalidateOnReconnect: false, // Disable - SSE handles reconnection
      refreshInterval: 0, // Disable polling - SSE handles real-time updates
      keepPreviousData: true,
      shouldRetryOnError: true,
      dedupingInterval: 5000, // Increase deduping to prevent spam
    },
  )

  return {
    items: data?.items ?? [],
    error,
    isLoading,
    mutate,
  }
}

export default function CommunityPage() {
  const { data: session } = useSession()
  const { channels, isLoading: channelsLoading, error: channelsError, refresh: refreshChannels } = useChannels()
  const [activeChannelId, setActiveChannelId] = useState<string | null>(channels[0]?.id ?? null)
  const [replyTo, setReplyTo] = useState<{ author: string; body: string } | null>(null)
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'

  React.useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id)
    }
  }, [channels, activeChannelId])

  const { items, isLoading, mutate } = useChannelMessages(activeChannelId)

  const optimisticMessages = useRef<Record<string, ChatMessage[]>>({})

  // Real-time messaging with SSE - use stable callback
  const handleNewMessage = useCallback((message: ChatMessage) => {
    // Remove from optimistic messages if it exists
    if (optimisticMessages.current[message.channelId]) {
      optimisticMessages.current[message.channelId] = optimisticMessages.current[message.channelId].filter(
        m => m.id !== message.id
      )
    }
    
    // Update the messages list immediately (optimistic update)
    mutate((current) => {
      if (!current) {
        // If no current data, create initial state
        return { ok: true, items: [message] }
      }
      
      // Check if message already exists (prevent duplicates)
      const exists = current.items.some(m => m.id === message.id)
      if (exists) return current
      
      return {
        ...current,
        items: [...current.items, message]
      }
    }, { revalidate: false })
  }, [mutate])

  const { isConnected, connectionError, reconnect } = useSSE({
    channelId: activeChannelId,
    onMessage: handleNewMessage,
    onTyping: (userId, userName, isTyping) => {
      handleTyping(userId, userName, isTyping)
    },
    onConnected: () => {
      // Connection established - no logging needed
    }
  })

  // Typing indicators
  const { typingText, handleTyping } = useTypingIndicator(activeChannelId)

  const mergedMessages = useMemo(() => {
    if (!activeChannelId) return []
    const optimistic = optimisticMessages.current[activeChannelId] ?? []
    const merged = [...items, ...optimistic]
    merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return merged
  }, [activeChannelId, items])

  // Auto-scroll to bottom when channel changes (initial load)
  const prevChannelRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    const container = document.getElementById('messages-container')
    const channelChanged = prevChannelRef.current !== activeChannelId
    
    // Always update the ref to track current channel, regardless of container existence
    prevChannelRef.current = activeChannelId
    
    if (channelChanged && container) {
      // Scroll to bottom when switching channels
      setTimeout(() => {
        container.scrollTop = container.scrollHeight
      }, 150)
    }
  }, [activeChannelId])

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeChannelId) return

      // Add reply context if replying
      const messageText = replyTo 
        ? `Replying to ${replyTo.author}: ${replyTo.body}\n\n${text}`
        : text

      const temp: ChatMessage = {
        id: `tmp:${crypto.randomUUID()}`,
        channelId: activeChannelId,
        userId: session?.user?.id ?? 'unknown',
        body: messageText,
        createdAt: new Date().toISOString(),
        author: {
          id: session?.user?.id ?? 'unknown',
          name: session?.user?.name ?? 'You',
          image: session?.user?.image ?? null,
        },
      }

      optimisticMessages.current[activeChannelId] = [
        ...(optimisticMessages.current[activeChannelId] ?? []),
        temp,
      ]

      await mutate((current) => current, { revalidate: false })

      try {
        const response = await json<CreateMessageResponse>('/api/community/messages', {
          method: 'POST',
          body: JSON.stringify({ channelId: activeChannelId, body: messageText }),
        })

        // Remove optimistic message
        optimisticMessages.current[activeChannelId] = (
          optimisticMessages.current[activeChannelId] ?? []
        ).filter((message) => message.id !== temp.id)

        // If SSE is working, it will update via handleNewMessage
        // If SSE is not working, manually add the message from response
        if (response?.item) {
          handleNewMessage(response.item)
        }
        
        // Clear reply after sending
        setReplyTo(null)
      } catch (error) {
        // Remove optimistic message on error
        optimisticMessages.current[activeChannelId] = (
          optimisticMessages.current[activeChannelId] ?? []
        ).filter((message) => message.id !== temp.id)

        // Trigger UI update to remove failed message
        mutate((current) => current, { revalidate: false })
        throw error
      }
    },
    [activeChannelId, mutate, replyTo, handleNewMessage],
  )

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyTo({
      author: message.author?.name ?? 'Anonymous',
      body: message.body,
    })
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyTo(null)
  }, [])

  const handleDeleteMessage = useCallback(async (message: ChatMessage) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      // json helper throws on error, so if it returns, it succeeded
      await json(`/api/community/messages/${message.id}`, {
        method: 'DELETE',
      })

      toast.success('Message deleted')
      mutate() // Refresh messages
    } catch (error) {
      toast.error('Failed to delete message')
    }
  }, [mutate])

  const activeChannel = channels.find((channel) => channel.id === activeChannelId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6">
              <span className="text-white">Crypto</span>
              <span className="text-yellow-400 ml-2 sm:ml-4">Community</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 px-4">
              Connect with fellow long-term investors and share insights in real-time
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-slate-400 flex-wrap px-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                <span className="text-sm sm:text-base font-medium">{channels.length} Investment Channels</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="text-sm sm:text-base font-medium">Active Members</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm sm:text-base font-medium">Real-time Chat</span>
              </div>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 text-sm text-slate-500">
                Debug: Session {session ? 'authenticated' : 'not authenticated'} | Channels: {channels.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Chat Interface */}
        <div className="flex flex-col md:flex-row h-[600px] md:h-[700px] bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
          <aside className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 md:p-6 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-slate-900">Channels</h3>
              <div className="flex items-center gap-2">
                {activeChannelId ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-xs text-slate-500">
                      {isConnected ? 'Connected' : connectionError || 'Connecting...'}
                    </span>
                    {!isConnected && connectionError && (
                      <button
                        onClick={() => reconnect()}
                        className="text-xs text-yellow-600 hover:text-yellow-700 underline"
                        title="Reconnect"
                      >
                        Reconnect
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-500">Select a channel</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Admin Controls */}
            {isAdmin && (
              <ChannelAdminControls
                channels={channels}
                isAdmin={isAdmin}
                onChannelChange={refreshChannels}
              />
            )}
            
            <div className="space-y-2">
              {channelsError ? (
                <div className="text-sm text-red-500 text-center py-4 bg-red-50 rounded-lg">
                  Error loading channels: {channelsError.message || 'Unknown error'}
                </div>
              ) : channelsLoading ? (
                <div className="text-sm text-slate-500 text-center py-4">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading channels...
                </div>
              ) : channels.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4 bg-slate-100 rounded-lg">No channels yet.</div>
              ) : (
                channels.map((channel: Channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id)
                      setReplyTo(null) // Clear reply when switching channels
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeChannelId === channel.id
                        ? 'bg-yellow-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">#</span>
                      <span>{channel.name}</span>
                    </div>
                    {channel.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{channel.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-200 p-4 md:p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-900">
                    {activeChannel?.name ? `# ${activeChannel.name}` : 'Select a channel'}
                  </h3>
                  {activeChannel?.description && (
                    <p className="text-xs md:text-sm text-slate-600 mt-1 line-clamp-2">{activeChannel.description}</p>
                  )}
                </div>
              </div>
              {/* Typing indicator */}
              {typingText && (
                <div className="mt-3 text-sm text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg">
                  {typingText}
                </div>
              )}
            </div>

            <div 
              id="messages-container"
              className="flex-1 overflow-y-auto bg-slate-50"
            >
              <MessageList 
                messages={mergedMessages} 
                isLoading={isLoading}
                currentUserId={session?.user?.id}
                isAdmin={isAdmin}
                onReply={handleReply}
                onDelete={handleDeleteMessage}
              />
            </div>

            <div className="border-t border-slate-200 bg-white">
              <MessageInput 
                onSend={handleSend} 
                disabled={!activeChannelId}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
                onTyping={async (isTyping) => {
                  if (!activeChannelId || !session?.user?.id) return
                  
                  // Silently fail - typing indicators are not critical
                  try {
                    await json('/api/community/typing', {
                      method: 'POST',
                      body: JSON.stringify({
                        channelId: activeChannelId,
                        isTyping,
                      }),
                    })
                  } catch (error) {
                    // Silently fail - typing indicators are not critical
                  }
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
