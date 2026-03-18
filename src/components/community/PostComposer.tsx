'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { PostCategory } from '@prisma/client'
import { CATEGORY_LABELS, CATEGORY_COLORS, POST_BODY_MAX_LENGTH } from '@/lib/community/constants'
import { uploadImage } from '@/lib/image-upload'
import { toast } from 'sonner'
import { ImageIcon, X, Send, Loader2 } from 'lucide-react'

interface PostComposerProps {
  onSubmit: (data: { body: string; category: PostCategory; imageUrl?: string }) => Promise<void>
  isAdmin?: boolean
  userImage?: string | null
  userName?: string | null
}

export function PostComposer({ onSubmit, isAdmin, userImage, userName }: PostComposerProps) {
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

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 300) + 'px'
  }, [])

  useEffect(() => {
    autoResize()
  }, [body, autoResize])

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

  const charCount = body.length
  const charWarning = charCount > POST_BODY_MAX_LENGTH * 0.9

  if (!expanded) {
    return (
      <button
        onClick={() => {
          setExpanded(true)
          setTimeout(() => textareaRef.current?.focus(), 50)
        }}
        className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)] text-sm hover:border-[var(--gold-400)]/30 transition-colors"
      >
        {userImage ? (
          <img src={userImage} alt="" className="w-10 h-10 rounded-full shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#2a2520] flex items-center justify-center text-sm font-medium text-[var(--text-muted)] shrink-0">
            {(userName?.[0] ?? '?').toUpperCase()}
          </div>
        )}
        <span>What&apos;s on your mind?</span>
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
      <div className="flex gap-3 p-5 pb-3">
        {userImage ? (
          <img src={userImage} alt="" className="w-10 h-10 rounded-full shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#2a2520] flex items-center justify-center text-sm font-medium text-[var(--text-muted)] shrink-0">
            {(userName?.[0] ?? '?').toUpperCase()}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts..."
          maxLength={POST_BODY_MAX_LENGTH}
          rows={2}
          className="w-full bg-transparent text-[var(--text-strong)] text-base placeholder:text-[var(--text-muted)] resize-none focus:outline-none leading-relaxed min-h-[60px]"
        />
      </div>

      {imageUrl && (
        <div className="px-5">
          <div className="relative inline-block rounded-xl overflow-hidden border border-[var(--border-subtle)]">
            <img src={imageUrl} alt="Upload" className="max-h-60 object-contain" />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5 hover:bg-red-900/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="flex items-center gap-1.5 px-5 pt-3 pb-2 overflow-x-auto">
        {categories.map(([value, label]) => {
          const colors = CATEGORY_COLORS[value as PostCategory]
          const isActive = category === value
          return (
            <button
              key={value}
              onClick={() => setCategory(value as PostCategory)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                isActive
                  ? `${colors.bg} ${colors.text} ring-1 ring-current/20`
                  : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815] rounded-lg transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Image'}
          </button>

          {charCount > 0 && (
            <span className={`text-xs ${charWarning ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
              {charCount}/{POST_BODY_MAX_LENGTH}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setExpanded(false); setBody(''); setImageUrl(null) }}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] px-3 py-1.5 rounded-lg hover:bg-[#1a1815] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gold-400)] text-[#0a0a0a] text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
