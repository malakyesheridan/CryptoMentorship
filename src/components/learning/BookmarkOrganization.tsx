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
      case 'Research': return 'bg-green-100 text-green-800 border-green-200'
      case 'Tutorial': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'News': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Strategy': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Technical': return 'bg-red-100 text-red-800 border-red-200'
      case 'Video': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'content': return <FileText className="h-4 w-4 text-blue-500" />
      case 'episode': return <Play className="h-4 w-4 text-purple-500" />
      default: return <Bookmark className="h-4 w-4 text-slate-500" />
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
        <Bookmark className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No saved content yet</h3>
        <p className="text-slate-600 mb-6">Start bookmarking articles, videos, and resources you want to revisit later.</p>
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
          <h2 className="text-2xl font-bold text-slate-900">Saved Content</h2>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
            {bookmarks.length} items
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* View mode toggle */}
          <div className="flex border border-slate-200 rounded-lg">
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
          <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No matches found</h3>
          <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
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
                          <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors duration-300">
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
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Saved {formatDate(bookmark.savedAt)}</span>
                          <Link 
                            href={bookmark.type === 'content' ? `/content/${bookmark.slug}` : `/crypto-compass/${bookmark.slug}`}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
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
                      <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-300 transition-all duration-300">
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
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-700 transition-colors duration-300">
                      {bookmark.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-300">
                      <span>Saved {formatDate(bookmark.savedAt)}</span>
                      <Link 
                        href={bookmark.type === 'content' ? `/content/${bookmark.slug}` : `/macro/${bookmark.slug}`}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors duration-300 group-hover:scale-105 transform-gpu"
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
