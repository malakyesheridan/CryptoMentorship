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
            <Bookmark className="h-16 w-16 text-slate-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Build Your Knowledge Library</h3>
            <p className="text-slate-600 mb-6">Save articles, videos, and resources you want to revisit later. Your personal learning collection starts here.</p>
          </div>
          
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full bg-purple-600 hover:bg-purple-700 text-white group-hover:shadow-lg transition-all duration-300">
              <Link href="/resources">
                <Bookmark className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Explore Content
              </Link>
            </Button>
            
            <div className="text-sm text-slate-500">
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
        return <Bookmark className="h-4 w-4 text-slate-500" />
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
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'episode':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
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
      case 'Research': return 'bg-green-100 text-green-800 border-green-200'
      case 'Tutorial': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'News': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Strategy': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Technical': return 'bg-red-100 text-red-800 border-red-200'
      case 'Video': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
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
                <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-300 transition-all duration-300">
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
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-sm transition-all opacity-0 group-hover:opacity-100 hover:scale-110 transform-gpu"
                  title="Remove bookmark"
                >
                  <X className="h-3 w-3 text-slate-600" />
                </button>
              )}
            </div>

            {/* Content info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-700 transition-colors duration-300">
                {bookmark.title}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-300">
                <span>Saved {formatDate(bookmark.savedAt)}</span>
                <Link 
                  href={bookmark.type === 'content' ? `/content/${bookmark.slug}` : `/crypto-compass/${bookmark.slug}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors duration-300 group-hover:scale-105 transform-gpu"
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
