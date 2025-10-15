'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BookmarkButtonProps {
  contentId?: string
  episodeId?: string
  isBookmarked?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function BookmarkButton({ 
  contentId, 
  episodeId, 
  isBookmarked = false, 
  className = '',
  size = 'md'
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    
    setLoading(true)
    const wasBookmarked = bookmarked

    // Optimistic update
    setBookmarked(!bookmarked)

    try {
      if (wasBookmarked) {
        // Remove bookmark
        const params = new URLSearchParams()
        if (contentId) params.set('contentId', contentId)
        if (episodeId) params.set('episodeId', episodeId)

        const response = await fetch(`/api/me/bookmarks?${params}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to remove bookmark')
        }

        toast.success('Removed from saved')
      } else {
        // Add bookmark
        const response = await fetch('/api/me/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentId,
            episodeId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to add bookmark')
        }

        toast.success('Saved for later')
      }
    } catch (error) {
      // Revert optimistic update
      setBookmarked(wasBookmarked)
      toast.error(wasBookmarked ? 'Failed to remove bookmark' : 'Failed to save bookmark')
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className={`${sizeClasses[size]} ${className} ${
        bookmarked ? 'text-gold-600 hover:text-gold-700' : 'text-slate-500 hover:text-slate-700'
      }`}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {bookmarked ? (
        <BookmarkCheck size={iconSizes[size]} className="fill-current" />
      ) : (
        <Bookmark size={iconSizes[size]} />
      )}
    </Button>
  )
}
