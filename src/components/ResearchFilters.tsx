'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter } from 'lucide-react'

const availableTags = [
  'Bitcoin', 'Ethereum', 'DeFi', 'NFT', 'Trading', 'Analysis', 
  'Institutional', 'Regulation', 'Layer 2', 'Yield Farming'
]

export function ResearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',') || []
  )

  const updateURL = (newSearch: string, newTags: string[]) => {
    const params = new URLSearchParams()
    
    if (newSearch) params.set('q', newSearch)
    if (newTags.length > 0) params.set('tags', newTags.join(','))
    
    const queryString = params.toString()
    const newURL = queryString ? `?${queryString}` : '/research'
    
    router.push(newURL)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    updateURL(value, selectedTags)
  }

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    
    setSelectedTags(newTags)
    updateURL(search, newTags)
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedTags([])
    router.push('/research')
  }

  const hasActiveFilters = search || selectedTags.length > 0

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
      <div className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search research articles..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-semibold text-slate-900">Filter by tags:</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-all duration-200 px-3 py-1 ${
                  selectedTags.includes(tag) 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'hover:bg-slate-100 hover:border-slate-300'
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <span className="text-sm font-medium text-slate-600">Active filters:</span>
            {search && (
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                Search: &ldquo;{search}&rdquo;
              </Badge>
            )}
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
