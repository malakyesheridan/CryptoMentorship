'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bookmark, 
  FileText, 
  Play, 
  TrendingUp, 
  BookOpen,
  X,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useBookmarks } from '@/hooks/usePersonalization'

interface SavedItem {
  type: 'content' | 'episode'
  slug: string
  title: string
  coverUrl?: string | null
  savedAt: Date
}

interface BookmarksGridProps {
  bookmarks: SavedItem[]
  maxItems?: number
  showRemoveButton?: boolean
  className?: string
}

export function BookmarksGrid({ 
  bookmarks, 
  maxItems = 6, 
  showRemoveButton = true,
  className = '' 
}: BookmarksGridProps) {
  const { removeBookmark, isBookmarked } = useBookmarks()
  const [removingId, setRemovingId] = useState<string | null>(null)

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className={cn('text-center py-12 px-6', className)}>
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Bookmark className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">Build Your Knowledge Library</h3>
            <p className="text-[var(--text-strong)] mb-6">Save articles, videos, and resources you want to revisit later. Your personal learning collection starts here.</p>
          </div>
          
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full bg-purple-600 hover:bg-purple-700 text-white group-hover:shadow-lg transition-all duration-300">
              <Link href="/resources">
                <Bookmark className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Explore Content
              </Link>
            </Button>
            
            <div className="text-sm text-[var(--text-muted)]">
              <p>📚 Save articles and research</p>
              <p>🎥 Bookmark video content</p>
              <p>🔖 Organize your favorites</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const displayBookmarks = bookmarks.slice(0, maxItems)

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'content':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'episode':
        return <Play className="h-4 w-4 text-purple-500" />
      default:
        return <Bookmark className="h-4 w-4 text-[var(--text-muted)]" />
    }
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'content':
        return 'Article'
      case 'episode':
        return 'Video'
      default:
        return 'Content'
    }
  }

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'content':
        return 'bg-[#1a1d2e] text-[#5b8dd9] border-[#1a1d2e]'
      case 'episode':
        return 'bg-[#231a2e] text-[#a78bfa] border-[#231a2e]'
      default:
        return 'bg-[#1a1815] text-[var(--text-strong)] border-[var(--border-subtle)]'
    }
  }

  const getContentCategory = (title: string, type: string) => {
    const titleLower = title.toLowerCase()
    
    // Define category keywords
    const categories = {
      'Research': ['research', 'analysis', 'market', 'crypto', 'bitcoin', 'ethereum'],
      'Tutorial': ['tutorial', 'guide', 'how to', 'step by step', 'learn'],
      'News': ['news', 'update', 'announcement', 'breaking', 'latest'],
      'Strategy': ['strategy', 'trading', 'investment', 'portfolio', 'risk'],
      'Technical': ['technical', 'chart', 'indicator', 'pattern', 'analysis']
    }
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return category
      }
    }
    
    return type === 'episode' ? 'Video' : 'Article'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Research': return 'bg-[#1a2e1a] text-[#4a7c3f] border-[#1a2e1a]'
      case 'Tutorial': return 'bg-[#1a1d2e] text-[#5b8dd9] border-[#1a1d2e]'
      case 'News': return 'bg-[#2a2018] text-[#d97706] border-[#2a2018]'
      case 'Strategy': return 'bg-[#231a2e] text-[#a78bfa] border-[#231a2e]'
      case 'Technical': return 'bg-[#2e1a1a] text-[#c03030] border-[#2e1a1a]'
      case 'Video': return 'bg-[#231a2e] text-[#a78bfa] border-[#231a2e]'
      default: return 'bg-[#1a1815] text-[var(--text-strong)] border-[var(--border-subtle)]'
    }
  }

  const handleRemoveBookmark = async (bookmark: SavedItem) => {
    setRemovingId(bookmark.slug)
    try {
      await removeBookmark(
        bookmark.type === 'content' ? bookmark.slug : undefined,
        bookmark.type === 'episode' ? bookmark.slug : undefined
      )
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return `${Math.ceil(diffDays / 30)} months ago`
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {displayBookmarks.map((bookmark) => (
        <Card key={`${bookmark.type}-${bookmark.slug}`} className="group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 transform-gpu">
          <CardContent className="p-4">
            {/* Content image */}
            <div className="relative mb-3 group-hover:scale-105 transition-transform duration-300">
              {bookmark.coverUrl ? (
                <Image
                  src={bookmark.coverUrl}
                  alt={bookmark.title}
                  width={300}
                  height={160}
                  className="w-full h-32 object-cover rounded-lg group-hover:brightness-110 transition-all duration-300"
                />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-[#1a1815] to-[#2a2520] rounded-lg flex items-center justify-center group-hover:from-[#2a2520] group-hover:to-[#2a2520] transition-all duration-300">
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    {getContentIcon(bookmark.type)}
                  </div>
                </div>
              )}
              
              {/* Content type badge */}
              <div className="absolute top-2 left-2 group-hover:scale-105 transition-transform duration-300">
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs', getCategoryColor(getContentCategory(bookmark.title, bookmark.type)))}
                >
                  {getContentIcon(bookmark.type)}
                  <span className="ml-1">{getContentCategory(bookmark.title, bookmark.type)}</span>
                </Badge>
              </div>

              {/* Remove button */}
              {showRemoveButton && (
                <button
                  onClick={() => handleRemoveBookmark(bookmark)}
                  disabled={removingId === bookmark.slug}
                  className="absolute top-2 right-2 bg-[var(--bg-panel)] hover:bg-[#1a1815] rounded-full p-1.5 shadow-sm transition-all opacity-0 group-hover:opacity-100 hover:scale-110 transform-gpu"
                  title="Remove bookmark"
                >
                  <X className="h-3 w-3 text-[var(--text-strong)]" />
                </button>
              )}
            </div>

            {/* Content info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--text-strong)] text-sm line-clamp-2 group-hover:text-[#5b8dd9] transition-colors duration-300">
                {bookmark.title}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] group-hover:text-[var(--text-strong)] transition-colors duration-300">
                <span>Saved {formatDate(bookmark.savedAt)}</span>
                <Link 
                  href={bookmark.type === 'content' ? `/content/${bookmark.slug}` : `/crypto-compass/${bookmark.slug}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-[#5b8dd9] transition-colors duration-300 group-hover:scale-105 transform-gpu"
                >
                  <span>View</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
