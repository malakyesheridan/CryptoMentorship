'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bookmark, 
  FileText, 
  Play, 
  Filter,
  Grid,
  List,
  Search,
  Tag
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

interface BookmarkOrganizationProps {
  bookmarks: SavedItem[]
  className?: string
}

export function BookmarkOrganization({ bookmarks, className = '' }: BookmarkOrganizationProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')

  const getContentCategory = (title: string, type: string) => {
    const titleLower = title.toLowerCase()
    
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

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'content': return <FileText className="h-4 w-4 text-blue-500" />
      case 'episode': return <Play className="h-4 w-4 text-purple-500" />
      default: return <Bookmark className="h-4 w-4 text-[var(--text-muted)]" />
    }
  }

  // Get all unique categories
  const categories = useMemo(() => {
    const categorySet = new Set(bookmarks.map(bookmark => getContentCategory(bookmark.title, bookmark.type)))
    return Array.from(categorySet).sort()
  }, [bookmarks])

  // Filter bookmarks based on selected category and search term
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(bookmark => {
      const category = getContentCategory(bookmark.title, bookmark.type)
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory
      const matchesSearch = searchTerm === '' || 
        bookmark.title.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesCategory && matchesSearch
    })
  }, [bookmarks, selectedCategory, searchTerm])

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

  if (bookmarks.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Bookmark className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">No saved content yet</h3>
        <p className="text-[var(--text-strong)] mb-6">Start bookmarking articles, videos, and resources you want to revisit later.</p>
        <Button asChild>
          <Link href="/resources">Explore Content</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-[var(--text-strong)]">Saved Content</h2>
          <Badge variant="secondary" className="bg-[#231a2e] text-[#a78bfa] border-[#231a2e]">
            {bookmarks.length} items
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-strong)] bg-[var(--bg-panel)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* View mode toggle */}
          <div className="flex border border-[var(--border-subtle)] rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          className="group-hover:scale-105 transition-transform duration-300"
        >
          <Filter className="h-4 w-4 mr-2" />
          All ({bookmarks.length})
        </Button>
        {categories.map(category => {
          const count = bookmarks.filter(b => getContentCategory(b.title, b.type) === category).length
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="group-hover:scale-105 transition-transform duration-300"
            >
              <Tag className="h-4 w-4 mr-2" />
              {category} ({count})
            </Button>
          )
        })}
      </div>

      {/* Bookmarks display */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-strong)] mb-2">No matches found</h3>
          <p className="text-[var(--text-strong)]">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        )}>
          {filteredBookmarks.map((bookmark) => {
            const category = getContentCategory(bookmark.title, bookmark.type)
            
            if (viewMode === 'list') {
              return (
                <Card key={`${bookmark.type}-${bookmark.slug}`} className="group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {bookmark.coverUrl && (
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={bookmark.coverUrl}
                            alt={bookmark.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-[var(--text-strong)] line-clamp-2 group-hover:text-[#5b8dd9] transition-colors duration-300">
                            {bookmark.title}
                          </h3>
                          <Badge 
                            variant="secondary" 
                            className={cn('text-xs ml-2 flex-shrink-0', getCategoryColor(category))}
                          >
                            {getContentIcon(bookmark.type)}
                            <span className="ml-1">{category}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span>Saved {formatDate(bookmark.savedAt)}</span>
                          <Link 
                            href={bookmark.type === 'content' ? `/content/${bookmark.slug}` : `/crypto-compass/${bookmark.slug}`}
                            className="text-blue-600 hover:text-[#5b8dd9] transition-colors"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }
            
            // Grid view (existing implementation)
            return (
              <Card key={`${bookmark.type}-${bookmark.slug}`} className="group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 transform-gpu">
                <CardContent className="p-4">
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
                    
                    <div className="absolute top-2 left-2 group-hover:scale-105 transition-transform duration-300">
                      <Badge 
                        variant="secondary" 
                        className={cn('text-xs', getCategoryColor(category))}
                      >
                        {getContentIcon(bookmark.type)}
                        <span className="ml-1">{category}</span>
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-[var(--text-strong)] text-sm line-clamp-2 group-hover:text-[#5b8dd9] transition-colors duration-300">
                      {bookmark.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] group-hover:text-[var(--text-strong)] transition-colors duration-300">
                      <span>Saved {formatDate(bookmark.savedAt)}</span>
                      <Link 
                        href={bookmark.type === 'content' ? `/content/${bookmark.slug}` : `/macro/${bookmark.slug}`}
                        className="flex items-center gap-1 text-blue-600 hover:text-[#5b8dd9] transition-colors duration-300 group-hover:scale-105 transform-gpu"
                      >
                        <span>View</span>
                        <Play className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
