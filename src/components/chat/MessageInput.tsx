'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (text: string) => Promise<void> | void
  disabled?: boolean
  placeholder?: string
  replyTo?: { author: string; body: string } | null
  onCancelReply?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function MessageInput({ 
  onSend, 
  disabled, 
  placeholder = "Write a message...",
  replyTo,
  onCancelReply,
  onTyping
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingCallRef = useRef<number>(0)
  const isTypingRef = useRef<boolean>(false)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text])

  // Focus textarea when reply changes
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [replyTo])

  // Handle typing indicators with aggressive debouncing (2 second minimum between calls)
  const handleTextChange = (value: string) => {
    setText(value)
    
    if (onTyping && !disabled && !busy) {
      // Clear existing timeouts
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      if (value.trim()) {
        const now = Date.now()
        // Only send typing indicator if 2 seconds have passed since last call
        if (!isTypingRef.current || now - lastTypingCallRef.current > 2000) {
          onTyping(true)
          lastTypingCallRef.current = now
          isTypingRef.current = true
        }
        
        // Send typing stop after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false)
          isTypingRef.current = false
        }, 3000)
      } else {
        // Immediately stop typing if text is cleared
        if (isTypingRef.current) {
          onTyping(false)
          isTypingRef.current = false
        }
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim() || busy || disabled) return

    const value = text
    setText('')
    setBusy(true)

    try {
      await onSend(value)
    } catch (error) {
      setText(value)
      throw error
    } finally {
      setBusy(false)
    }
  }

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
      }
    }
  }, [])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit(event)
    }
  }

  return (
    <div className="bg-white">
      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 sm:px-6 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 flex-1">
              <span className="text-slate-600 whitespace-nowrap">Replying to</span>
              <span className="font-medium text-slate-800 truncate">{replyTo.author}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-8 sm:h-6 px-2 sm:px-2 text-slate-500 hover:text-slate-700 flex-shrink-0 min-h-[44px] sm:min-h-0"
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-slate-600 mt-1 truncate">{replyTo.body}</p>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={submit} className="flex items-end gap-2 sm:gap-3 p-4 sm:p-6">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || busy}
            placeholder={disabled ? 'Select a channel…' : placeholder}
            className="min-h-[44px] max-h-[120px] resize-none border-slate-200 focus:border-yellow-500 focus:ring-yellow-500 rounded-lg text-sm sm:text-base"
            rows={1}
          />
        </div>
        <Button
          type="submit"
          disabled={disabled || busy || !text.trim()}
          className="bg-yellow-500 hover:bg-yellow-600 text-white h-11 w-11 sm:w-auto sm:px-4 rounded-lg flex-shrink-0"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Send</span>
        </Button>
      </form>

      {/* Character count */}
      {text.length > 0 && (
        <div className="px-6 pb-3">
          <div className="text-xs text-slate-500 text-right">
            {text.length}/5000
          </div>
        </div>
      )}
    </div>
  )
}

