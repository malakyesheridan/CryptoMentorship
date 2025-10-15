'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Calendar, ArrowRight, FileText, Download, Users, Eye, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface Resource {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  coverUrl: string
  tags: string | null
  publishedAt: Date | null
  locked: boolean
  kind: string
  minTier: string | null
}

interface ResourceFiltersProps {
  resources: Resource[]
  onFilteredResources: (filtered: Resource[]) => void
}

export default function ResourceFilters({ resources, onFilteredResources }: ResourceFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [accessFilter, setAccessFilter] = useState<'all' | 'public' | 'member'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Extract unique categories from resources
  const categories = useMemo(() => {
    const categorySet = new Set<string>()
    resources.forEach(resource => {
      if (resource.tags) {
        try {
          const tags = JSON.parse(resource.tags)
          if (Array.isArray(tags)) {
            tags.forEach(tag => categorySet.add(tag))
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    })
    return Array.from(categorySet).sort()
  }, [resources])

  const filteredAndSortedResources = useMemo(() => {
    let filtered = resources

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(resource => 
        resource.title.toLowerCase().includes(query) ||
        (resource.description && resource.description.toLowerCase().includes(query))
      )
    }

    // Apply access filter
    if (accessFilter !== 'all') {
      filtered = filtered.filter(resource => {
        if (accessFilter === 'public') return !resource.locked
        if (accessFilter === 'member') return resource.locked
        return true
      })
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(resource => {
        if (!resource.tags) return false
        try {
          const tags = JSON.parse(resource.tags)
          return Array.isArray(tags) && tags.includes(categoryFilter)
        } catch (e) {
          return false
        }
      })
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
        case 'oldest':
          return new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    return filtered
  }, [resources, searchQuery, accessFilter, sortBy, categoryFilter])

  // Update parent component with filtered results
  useMemo(() => {
    onFilteredResources(filteredAndSortedResources)
  }, [filteredAndSortedResources, onFilteredResources])

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search resources..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {categories.length > 0 && (
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-36 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          )}
          <select 
            value={accessFilter} 
            onChange={(e) => setAccessFilter(e.target.value as 'all' | 'public' | 'member')}
            className="w-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Access</option>
            <option value="public">Public</option>
            <option value="member">Member Only</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
            className="w-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>
      
      {/* Results count */}
      <div className="mt-4 text-sm text-slate-600">
        Showing {filteredAndSortedResources.length} of {resources.length} resources
        {searchQuery && (
          <span className="ml-2">
            for &quot;{searchQuery}&quot;
          </span>
        )}
      </div>
    </div>
  )
}
