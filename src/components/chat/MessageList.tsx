'use client'

import Image from 'next/image'
import { formatRelative } from 'date-fns'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash2, Reply } from 'lucide-react'
import type { ChatMessage } from '@/lib/community/types'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  currentUserId?: string
  isAdmin?: boolean
  onEdit?: (message: ChatMessage) => void
  onDelete?: (message: ChatMessage) => void
  onReply?: (message: ChatMessage) => void
}

export default function MessageList({ 
  messages, 
  isLoading, 
  currentUserId,
  isAdmin = false,
  onEdit,
  onDelete,
  onReply 
}: MessageListProps) {
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(0)

  // Auto-scroll to bottom when messages change (new messages added)
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current
    const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0
    
    if ((hasNewMessages || isInitialLoad) && messagesEndRef.current) {
      // Use instant scroll for initial load, smooth for new messages
      messagesEndRef.current.scrollIntoView({ 
        behavior: isInitialLoad ? 'auto' : 'smooth' 
      })
    }
    
    prevMessagesLengthRef.current = messages.length
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          Loading messages...
        </div>
      </div>
    )
  }

  if (!messages?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-600 mb-2">No messages yet</h3>
        <p className="text-sm text-slate-500">Be the first to start the conversation!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => {
        const isTemp = message.id.startsWith('tmp:')
        const timestamp = new Date(message.createdAt)
        const isOwnMessage = currentUserId && message.userId === currentUserId
        const canModify = (isOwnMessage || isAdmin) && !isTemp

        return (
          <div 
            key={message.id} 
            className="group flex gap-3 hover:bg-slate-50/50 rounded-lg p-2 -m-2 transition-colors"
            onMouseEnter={() => setHoveredMessage(message.id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex-shrink-0">
              {message.author?.image ? (
                <Image
                  src={message.author.image}
                  alt={message.author.name ?? 'Member'}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-medium">
                  {message.author?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800 text-sm">
                  {message.author?.name ?? 'Anonymous'}
                </span>
                <time 
                  className="text-xs text-slate-500"
                  title={message.createdAt}
                >
                  {formatRelative(timestamp, new Date())}
                </time>
                {isTemp && (
                  <span className="text-xs text-amber-600 font-medium">(sending...)</span>
                )}
                {canModify && hoveredMessage === message.id && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                      onClick={() => onReply?.(message)}
                    >
                      <Reply className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                      onClick={() => onEdit?.(message)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => onDelete?.(message)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed m-0">
                  {message.body}
                </p>
              </div>
            </div>
          </div>
        )
      })}
      {/* Invisible element at the bottom for scroll target */}
      <div ref={messagesEndRef} />
    </div>
  )
}
