'use client'

import { useState } from 'react'

interface MessageInputProps {
  onSend: (text: string) => Promise<unknown> | unknown
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim() || busy || disabled) return

    const payload = text
    setBusy(true)
    setText('')

    try {
      await onSend(payload)
    } catch (error) {
      setText(payload)
      throw error
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-[color:var(--border-subtle)] p-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={disabled ? 'Select a channel…' : 'Type a message…'}
          disabled={disabled || busy}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={disabled || busy || !text.trim()}
          className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </form>
  )
}
