'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface ReportDialogProps {
  type: 'post' | 'comment'
  targetId: string
  onClose: () => void
}

export function ReportDialog({ type, targetId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!reason.trim() || submitting) return
    setSubmitting(true)
    try {
      const url = type === 'post'
        ? `/api/community/posts/${targetId}/report`
        : `/api/community/comments/${targetId}/report`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (res.ok) {
        toast.success('Report submitted')
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to submit report')
      }
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1815] border border-[var(--border-subtle)] rounded-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-strong)]">
            Report {type === 'post' ? 'Post' : 'Comment'}
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-strong)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you reporting this?"
          maxLength={1000}
          rows={4}
          className="w-full bg-[var(--bg-panel)] text-[var(--text-strong)] text-sm placeholder:text-[var(--text-muted)] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--gold-400)]/30 border border-[var(--border-subtle)]"
          autoFocus
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-500 transition"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
