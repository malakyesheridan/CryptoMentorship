'use client'

import React, { useState, useMemo } from 'react'
import { Search, Filter, SortAsc, SortDesc, Calendar, Play, Video, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from '@/components/ui/badge'

interface SearchFilterProps {
  episodes: any[]
  videos: any[]
  onFilteredEpisodes: (episodes: any[]) => void
  onFilteredVideos: (videos: any[]) => void
}

type SortOption = 'newest' | 'oldest' | 'title' | 'duration'
type FilterType = 'all' | 'episodes' | 'videos' | 'locked' | 'unlocked'

export default function CryptoCompassSearchFilter({ 
  episodes, 
  videos, 
  onFilteredEpisodes, 
  onFilteredVideos 
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterBy, setFilterBy] = useState<FilterType>('all')

  const filteredAndSortedData = useMemo(() => {
    let filteredEpisodes = [...episodes]
    let filteredVideos = [...videos]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredEpisodes = episodes.filter(episode => 
        episode.title.toLowerCase().includes(query) ||
        (episode.summary && episode.summary.toLowerCase().includes(query))
      )
      filteredVideos = videos.filter(video => 
        video.title.toLowerCase().includes(query) ||
        (video.description && video.description.toLowerCase().includes(query))
      )
    }

    // Apply content type filter
    if (filterBy === 'episodes') {
      filteredVideos = []
    } else if (filterBy === 'videos') {
      filteredEpisodes = []
    } else if (filterBy === 'locked') {
      // Locked filter removed - all episodes are accessible
      filteredVideos = filteredVideos.filter(video => video.visibility !== 'public')
    } else if (filterBy === 'unlocked') {
      // Unlocked filter removed - all episodes are accessible
      filteredVideos = filteredVideos.filter(video => video.visibility === 'public')
    }

    // Apply sorting
    const sortFunction = (a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
        case 'oldest':
          return new Date(a.publishedAt || a.createdAt).getTime() - new Date(b.publishedAt || b.createdAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'duration':
          // For episodes, we don't have duration yet, so sort by title
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    }

    filteredEpisodes.sort(sortFunction)
    filteredVideos.sort(sortFunction)

    return { episodes: filteredEpisodes, videos: filteredVideos }
  }, [episodes, videos, searchQuery, sortBy, filterBy])

  // Update parent components when filters change
  React.useEffect(() => {
    onFilteredEpisodes(filteredAndSortedData.episodes)
    onFilteredVideos(filteredAndSortedData.videos)
  }, [filteredAndSortedData, onFilteredEpisodes, onFilteredVideos])

  const clearFilters = () => {
    setSearchQuery('')
    setSortBy('newest')
    setFilterBy('all')
  }

  const hasActiveFilters = searchQuery.trim() || filterBy !== 'all' || sortBy !== 'newest'

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search episodes and videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg border-slate-200 focus:border-gold-500 focus:ring-gold-500 rounded-xl"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ×
          </Button>
        )}
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filter:</span>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', icon: null },
              { key: 'episodes', label: 'Episodes', icon: Play },
              { key: 'videos', label: 'Videos', icon: Video },
              { key: 'locked', label: 'Locked', icon: null },
              { key: 'unlocked', label: 'Unlocked', icon: null }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filterBy === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterBy(key as FilterType)}
                className={`text-xs px-3 py-1 h-auto ${
                  filterBy === key 
                    ? 'bg-gold-500 text-white border-gold-500' 
                    : 'text-slate-600 border-slate-200 hover:border-gold-300'
                }`}
              >
                {Icon && <Icon className="w-3 h-3 mr-1" />}
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Sort:</span>
          <div className="flex gap-2">
            {[
              { key: 'newest', label: 'Newest', icon: Calendar },
              { key: 'oldest', label: 'Oldest', icon: Calendar },
              { key: 'title', label: 'Title', icon: null }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={sortBy === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(key as SortOption)}
                className={`text-xs px-3 py-1 h-auto ${
                  sortBy === key 
                    ? 'bg-gold-500 text-white border-gold-500' 
                    : 'text-slate-600 border-slate-200 hover:border-gold-300'
                }`}
              >
                {Icon && <Icon className="w-3 h-3 mr-1" />}
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-500 hover:text-slate-700 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              <Badge variant="outline" className="mr-1">{filteredAndSortedData.episodes.length}</Badge>
              Episodes
            </span>
            <span>
              <Badge variant="outline" className="mr-1">{filteredAndSortedData.videos.length}</Badge>
              Videos
            </span>
          </div>
          {hasActiveFilters && (
            <span className="text-gold-600 font-medium">
              Showing filtered results
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
