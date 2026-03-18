'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { COMMENT_BODY_MAX_LENGTH } from '@/lib/community/constants'

interface CommentComposerProps {
  onSubmit: (body: string) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
}

export function CommentComposer({ onSubmit, placeholder = 'Write a comment...', autoFocus }: CommentComposerProps) {
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={COMMENT_BODY_MAX_LENGTH}
        autoFocus={autoFocus}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="flex-1 bg-[#1a1815] text-[var(--text-strong)] text-sm placeholder:text-[var(--text-muted)] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--gold-400)]/30 border border-[var(--border-subtle)]"
      />
      <button
        onClick={handleSubmit}
        disabled={!body.trim() || submitting}
        className="p-2 rounded-lg bg-[var(--gold-400)] text-[#0a0a0a] disabled:opacity-50 hover:brightness-110 transition shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}
