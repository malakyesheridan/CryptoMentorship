'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Smile } from 'lucide-react'

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

  // Handle typing indicators
  const handleTextChange = (value: string) => {
    setText(value)
    
    if (onTyping && !disabled && !busy) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Send typing start if there's text
      if (value.trim()) {
        onTyping(true)
        
        // Send typing stop after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false)
        }, 2000)
      } else {
        onTyping(false)
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

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
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
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Replying to</span>
              <span className="font-medium text-slate-800">{replyTo.author}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 px-2 text-slate-500 hover:text-slate-700"
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-slate-600 mt-1 truncate">{replyTo.body}</p>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={submit} className="flex items-end gap-3 p-6">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || busy}
            placeholder={disabled ? 'Select a channel…' : placeholder}
            className="min-h-[44px] max-h-[120px] resize-none pr-12 border-slate-200 focus:border-yellow-500 focus:ring-yellow-500 rounded-lg"
            rows={1}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
              disabled={disabled || busy}
            >
              <Paperclip className="w-3 h-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
              disabled={disabled || busy}
            >
              <Smile className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={disabled || busy || !text.trim()}
          className="bg-yellow-500 hover:bg-yellow-600 text-white h-11 px-4 rounded-lg"
        >
          <Send className="w-4 h-4" />
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

