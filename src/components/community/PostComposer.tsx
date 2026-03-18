'use client'

import { useState, useRef } from 'react'
import { PostCategory } from '@prisma/client'
import { CATEGORY_LABELS, POST_BODY_MAX_LENGTH } from '@/lib/community/constants'
import { uploadImage } from '@/lib/image-upload'
import { toast } from 'sonner'
import { ImageIcon, X, Send } from 'lucide-react'

interface PostComposerProps {
  onSubmit: (data: { body: string; category: PostCategory; imageUrl?: string }) => Promise<void>
  isAdmin?: boolean
}

export function PostComposer({ onSubmit, isAdmin }: PostComposerProps) {
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<PostCategory>('GENERAL')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const categories = Object.entries(CATEGORY_LABELS).filter(
    ([value]) => value !== 'ANNOUNCEMENTS' || isAdmin
  )

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadImage({ file, folder: 'community' })
    setUploading(false)
    if (result.success && result.url) {
      setImageUrl(result.url)
    } else {
      toast.error(result.error || 'Upload failed')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({ body: body.trim(), category, imageUrl: imageUrl ?? undefined })
      setBody('')
      setCategory('GENERAL')
      setImageUrl(null)
      setExpanded(false)
    } catch {
      toast.error('Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => {
          setExpanded(true)
          setTimeout(() => textareaRef.current?.focus(), 50)
        }}
        className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)] text-sm hover:border-[var(--gold-400)]/30 transition-colors mb-4"
      >
        What&apos;s on your mind?
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 mb-4">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your thoughts..."
        maxLength={POST_BODY_MAX_LENGTH}
        rows={3}
        className="w-full bg-transparent text-[var(--text-strong)] text-sm placeholder:text-[var(--text-muted)] resize-none focus:outline-none"
      />

      {imageUrl && (
        <div className="relative mt-2 inline-block">
          <img src={imageUrl} alt="Upload" className="max-h-40 rounded-lg" />
          <button
            onClick={() => setImageUrl(null)}
            className="absolute -top-2 -right-2 bg-[#0a0a0a] rounded-full p-1 hover:bg-red-900"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PostCategory)}
            className="text-xs bg-[#1a1815] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 focus:outline-none"
          >
            {categories.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          {uploading && <span className="text-xs text-[var(--text-muted)]">Uploading...</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setExpanded(false); setBody(''); setImageUrl(null) }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--gold-400)] text-[#0a0a0a] text-sm font-medium disabled:opacity-50 hover:brightness-110 transition"
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
