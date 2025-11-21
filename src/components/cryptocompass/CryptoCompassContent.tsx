'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CryptoCompassTabs, CategoryType } from './CryptoCompassTabs'
import Link from 'next/link'
import { Play, Lock, Calendar, Clock, ArrowRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'

interface Episode {
  slug: string
  title: string
  summary: string | null
  coverUrl: string
  publishedAt: string // ISO date string
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
}

export function CryptoCompassContent({ 
  episodes, 
  userRole, 
  userTier, 
  pagination, 
  currentCategory, 
  currentSearch 
}: CryptoCompassContentProps) {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<CategoryType>((currentCategory as CategoryType) || 'all')
  const [searchQuery, setSearchQuery] = useState(currentSearch || '')
  
  // Sync with URL params on mount
  useEffect(() => {
    if (currentCategory) {
      setActiveCategory(currentCategory as CategoryType)
    }
    if (currentSearch) {
      setSearchQuery(currentSearch)
    }
  }, [currentCategory, currentSearch])

  // Episodes are already filtered by server, but we can do client-side filtering for instant feedback
  // Server handles the actual pagination and filtering
  const filteredEpisodes = useMemo(() => {
    // Server has already filtered, but we maintain client-side filtering for consistency
    // This ensures UI matches what server sent
    return episodes
  }, [episodes])
  
  const handleCategoryChange = (category: CategoryType) => {
    setActiveCategory(category)
    const newSearchParams = new URLSearchParams(window.location.search)
    if (category === 'all') {
      newSearchParams.delete('category')
    } else {
      newSearchParams.set('category', category)
    }
    newSearchParams.delete('cursor') // Reset cursor on category change
    router.push(`?${newSearchParams.toString()}`, { scroll: false })
  }
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    const newSearchParams = new URLSearchParams(window.location.search)
    if (e.target.value.trim() === '') {
      newSearchParams.delete('search')
    } else {
      newSearchParams.set('search', e.target.value)
    }
    newSearchParams.delete('cursor') // Reset cursor on search change
    router.push(`?${newSearchParams.toString()}`, { scroll: false })
  }
  
  const handleLoadMore = () => {
    if (pagination?.hasNextPage && pagination.nextCursor) {
      const newSearchParams = new URLSearchParams(window.location.search)
      newSearchParams.set('cursor', pagination.nextCursor)
      newSearchParams.set('limit', String(pagination.limit))
      router.push(`?${newSearchParams.toString()}`, { scroll: false })
    }
  }

  // Calculate counts for each category
  const categoryCounts = useMemo(() => {
    return {
      all: episodes.length,
      dailyUpdate: episodes.filter(ep => ep.category === 'daily-update').length,
      analysis: episodes.filter(ep => ep.category === 'analysis').length,
      breakdown: episodes.filter(ep => ep.category === 'breakdown').length,
    }
  }, [episodes])

  // Get category badge color
  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'daily-update':
        return 'bg-blue-500 text-white border-blue-600'
      case 'analysis':
        return 'bg-purple-500 text-white border-purple-600'
      case 'breakdown':
        return 'bg-green-500 text-white border-green-600'
      default:
        return 'bg-slate-500 text-white border-slate-600'
    }
  }

  // Get category display name
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'daily-update':
        return 'Weekly Update'
      case 'analysis':
        return 'Analysis'
      case 'breakdown':
        return 'Breakdown'
      default:
        return category
    }
  }

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <CryptoCompassTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        counts={categoryCounts}
      />

      {/* Search Bar */}
      <div className="relative mb-8">
        <Input
          type="text"
          placeholder="Search episodes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent shadow-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      </div>

      {/* Episodes Grid */}
      {filteredEpisodes.length > 0 ? (
        <div className="space-y-6">
          {filteredEpisodes.map((episode) => {
            const canView = !episode.locked || userRole === 'admin' || (userTier && ['T2', 'T3'].includes(userTier))

            return (
              <Link key={episode.slug} href={`/crypto-compass/${episode.slug}`}>
                <article className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 border border-slate-200 overflow-hidden">
                  <div className="flex flex-col lg:flex-row">
                    {/* Episode Image */}
                    <div className="lg:w-80 lg:h-48 h-64 relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                      <img
                        src={episode.coverUrl ?? '/images/placeholders/episode-cover.jpg'}
                        alt={episode.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                      <div className="absolute top-4 left-4">
                        <Badge className={`text-sm px-3 py-1 font-medium ${getCategoryBadgeColor(episode.category)}`}>
                          {getCategoryName(episode.category)}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4">
                        {!canView && (
                          <Badge className="bg-red-500 text-white border-red-600 text-sm px-3 py-1 font-medium">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors shadow-lg">
                          <Play className="w-6 h-6 text-slate-900 ml-1" />
                        </div>
                      </div>
                    </div>

                    {/* Episode Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-yellow-600 transition-colors line-clamp-2">
                            {episode.title}
                          </h3>
                          <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">
                            {episode.summary || 'No description available.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(new Date(episode.publishedAt), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>~15 min</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-500 transition-colors">
                          <span className="font-medium">Watch</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Access Control Overlay */}
                  {!canView && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-600">Member Only</p>
                        <p className="text-xs text-slate-500">Upgrade to access</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </article>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {searchQuery ? 'No episodes found' : 'No Episodes Yet'}
          </h3>
          <p className="text-slate-600">
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
                const newSearchParams = new URLSearchParams(window.location.search)
                newSearchParams.delete('search')
                router.push(`?${newSearchParams.toString()}`, { scroll: false })
              }}
              className="mt-4 text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Load More Button */}
      {pagination?.hasNextPage && (
        <div className="text-center mt-8">
          <Button
            onClick={handleLoadMore}
            className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-300 transition-colors"
          >
            Load More Episodes
          </Button>
        </div>
      )}
    </div>
  )
}

