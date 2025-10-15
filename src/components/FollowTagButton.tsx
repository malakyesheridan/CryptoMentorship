'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FollowTagButtonProps {
  tag: string
  isFollowing?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function FollowTagButton({ 
  tag, 
  isFollowing = false, 
  className = '',
  size = 'md'
}: FollowTagButtonProps) {
  const [following, setFollowing] = useState(isFollowing)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    
    setLoading(true)
    const wasFollowing = following

    // Optimistic update
    setFollowing(!following)

    try {
      if (wasFollowing) {
        // Unfollow tag
        const response = await fetch(`/api/me/interests?tag=${encodeURIComponent(tag)}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to unfollow tag')
        }

        toast.success(`Unfollowed ${tag}`)
      } else {
        // Follow tag
        const response = await fetch('/api/me/interests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tag }),
        })

        if (!response.ok) {
          throw new Error('Failed to follow tag')
        }

        toast.success(`Following ${tag}`)
      }
    } catch (error) {
      // Revert optimistic update
      setFollowing(wasFollowing)
      toast.error(wasFollowing ? `Failed to unfollow ${tag}` : `Failed to follow ${tag}`)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm'
  }

  const iconSizes = {
    sm: 12,
    md: 14
  }

  return (
    <Button
      variant={following ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`${sizeClasses[size]} ${className} ${
        following 
          ? 'bg-gold-500 hover:bg-gold-600 text-white border-gold-500' 
          : 'text-slate-600 hover:text-slate-700 border-slate-300'
      }`}
      aria-label={following ? `Unfollow ${tag}` : `Follow ${tag}`}
    >
      {following ? (
        <Check size={iconSizes[size]} className="mr-1" />
      ) : (
        <Plus size={iconSizes[size]} className="mr-1" />
      )}
      {tag}
    </Button>
  )
}
