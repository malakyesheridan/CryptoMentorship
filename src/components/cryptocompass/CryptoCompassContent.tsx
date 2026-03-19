'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CryptoCompassTabs, CategoryType } from './CryptoCompassTabs'
import Link from 'next/link'
import { Play, Calendar, Clock, Search, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/dates'

interface Episode {
  slug: string
  title: string
  summary: string | null
  coverUrl: string | null
  duration: number | null
  publishedAt: string
  locked: boolean
  category: string
}

interface CryptoCompassContentProps {
  episodes: Episode[]
  userRole: string
  userTier: string | null
  pagination?: {
    hasNextPage: boolean
    nextCursor: string | null
    limit: number
  }
  currentCategory?: string
  currentSearch?: string
  currentSort?: string
  categoryCounts?: {
    all: number
    dailyUpdate: number
    analysis: number
    breakdown: number
  }
}

export function CryptoCompassContent({
  episodes,
  userRole,
  userTier,
  pagination,
  currentCategory,
  currentSearch,
  currentSort,
  categoryCounts,
}: CryptoCompassContentProps) {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<CategoryType>((currentCategory as CategoryType) || 'all')
  const [searchQuery, setSearchQuery] = useState(currentSearch || '')
  const [sort, setSort] = useState(currentSort || 'newest')
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (currentCategory) setActiveCategory(currentCategory as CategoryType)
    if (currentSearch) setSearchQuery(currentSearch)
    if (currentSort) setSort(currentSort)
  }, [currentCategory, currentSearch, currentSort])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const pushParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete('cursor')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleCategoryChange = (category: CategoryType) => {
    setActiveCategory(category)
    pushParams({ category: category === 'all' ? null : category })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams({ search: value.trim() || null })
    }, 400)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSort(value)
    pushParams({ sort: value === 'newest' ? null : value })
  }

  const handleLoadMore = () => {
    if (pagination?.hasNextPage && pagination.nextCursor) {
      const params = new URLSearchParams(window.location.search)
      params.set('cursor', pagination.nextCursor)
      params.set('limit', String(pagination.limit))
      router.push(`?${params.toString()}`, { scroll: false })
    }
  }

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'daily-update': return 'bg-blue-600 text-white border-blue-700'
      case 'analysis': return 'bg-purple-600 text-white border-purple-700'
      case 'breakdown': return 'bg-green-600 text-white border-green-700'
      default: return 'bg-[var(--border-subtle)] text-white border-[var(--border-subtle)]'
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'daily-update': return 'Weekly Update'
      case 'analysis': return 'Analysis'
      case 'breakdown': return 'Breakdown'
      default: return category
    }
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return ''
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) {
      return remainingSeconds === 0 ? `${minutes} min` : `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`
  }

  const getCoverUrl = (url: string | null) => {
    if (!url) return null
    return url.startsWith('http') || url.startsWith('/') ? url : null
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <CryptoCompassTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          counts={categoryCounts}
        />
      </div>

      {/* Search + Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search episodes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <Select
            value={sort}
            onChange={handleSortChange}
            className="bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-strong)] text-sm w-[140px]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="longest">Longest</option>
            <option value="shortest">Shortest</option>
          </Select>
        </div>
      </div>

      {/* Episodes Grid */}
      {episodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {episodes.map((episode) => (
            <Link key={episode.slug} href={`/crypto-compass/${episode.slug}`}>
              <article className="group bg-[var(--bg-panel)] rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-[var(--border-subtle)] overflow-hidden hover:-translate-y-0.5">
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-[#1a1815] to-[#2a2520]">
                  {getCoverUrl(episode.coverUrl) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={getCoverUrl(episode.coverUrl) as string}
                      alt={episode.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-12 h-12 text-white/40" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <Badge className={`text-xs px-2 py-0.5 font-medium ${getCategoryBadgeColor(episode.category)}`}>
                      {getCategoryName(episode.category)}
                    </Badge>
                  </div>
                  {/* Duration badge */}
                  {episode.duration && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                        {formatDuration(episode.duration)}
                      </span>
                    </div>
                  )}
                  {/* Play icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-base font-semibold text-[var(--text-strong)] mb-2 line-clamp-2 group-hover:text-yellow-500 transition-colors leading-snug">
                    {episode.title}
                  </h3>
                  {episode.summary && (
                    <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2 leading-relaxed">
                      {episode.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(new Date(episode.publishedAt), 'MMM d, yyyy')}</span>
                    </div>
                    {episode.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(episode.duration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--bg-panel)] rounded-xl shadow-md border border-[var(--border-subtle)] p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1a1815] to-[#2a2520] rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-strong)] mb-2">
            {searchQuery ? 'No episodes found' : 'No Episodes Yet'}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {searchQuery
              ? `No episodes match "${searchQuery}". Try a different search.`
              : activeCategory !== 'all'
              ? `No ${getCategoryName(activeCategory)} episodes available yet.`
              : 'Check back soon for new Crypto Compass insights!'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                pushParams({ search: null })
              }}
              className="mt-3 text-yellow-500 hover:text-yellow-400 font-medium text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Load More */}
      {pagination?.hasNextPage && (
        <div className="text-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="border-[var(--border-subtle)] text-[var(--text-strong)] px-8"
          >
            Load More Episodes
          </Button>
        </div>
      )}
    </div>
  )
}
