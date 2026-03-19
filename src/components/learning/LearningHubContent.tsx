'use client'

import { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ContentGrid } from './ContentGrid'
import { TrackEditModal } from './TrackEditModal'
import { UploadModal } from './UploadModal'
import { ProgressTimeline } from './ProgressTimeline'
import { Input } from '@/components/ui/input'
import { Search, Flame, Upload, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LearningHubContentProps {
  enrollments: any[]
  progress: any[]
  certificates: any[]
  allCourses: any[]
  streak: number
  userId: string
  userRole: string
  userTier: string | null
}

export function LearningHubContent({
  enrollments,
  progress,
  certificates,
  allCourses,
  streak,
  userId,
  userRole,
  userTier
}: LearningHubContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()
  const isAdmin = userRole === 'admin' || userRole === 'editor'

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 400)
  }

  // Build unified track list
  const allTracks = useMemo(() => {
    const enrollmentMap = new Map(enrollments.map((e: any) => [e.trackId, e]))
    return allCourses.map((course: any) => {
      const enrollment = enrollmentMap.get(course.id)
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        coverUrl: course.coverUrl,
        type: 'course' as const,
        locked: false,
        progressPct: enrollment ? enrollment.progressPct : undefined,
        publishedAt: course.publishedAt,
        totalLessons: course.totalLessons,
      }
    })
  }, [allCourses, enrollments])

  // Filter by debounced search
  const filteredTracks = useMemo(() => {
    if (!debouncedSearch) return allTracks
    const query = debouncedSearch.toLowerCase()
    return allTracks.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    )
  }, [allTracks, debouncedSearch])

  const hasProgress = enrollments.length > 0 || certificates.length > 0

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Learning Hub</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Browse tracks, continue learning, and track your progress
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-gold-500 hover:bg-gold-600 text-white font-medium shrink-0"
          >
            <Upload className="w-4 h-4 mr-2" />
            Create Track
          </Button>
        )}
      </div>

      {/* Streak Banner */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-[#2a2418] to-[#2a2418] border border-[#2a2418] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gold-500 rounded-lg flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                {streak} day{streak !== 1 ? 's' : ''} learning streak!
              </p>
              <p className="text-xs text-[var(--text-muted)]">Keep it up!</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search learning tracks..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 pr-4 py-2 rounded-lg border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      </div>

      {/* Track Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'} available
        </p>
      </div>

      {/* Tracks Grid */}
      {filteredTracks.length > 0 ? (
        <ContentGrid
          items={filteredTracks}
          showProgress={true}
          userRole={userRole}
          onEditTrack={(trackId) => setEditingTrackId(trackId)}
        />
      ) : (
        <div className="bg-[var(--bg-panel)] rounded-xl shadow-md border border-[var(--border-subtle)] p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text-strong)] mb-2">
            {debouncedSearch ? 'No tracks found' : 'No Learning Tracks'}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {debouncedSearch
              ? `No tracks match "${debouncedSearch}". Try a different search.`
              : 'Check back soon for new learning content!'
            }
          </p>
          {debouncedSearch && (
            <button
              onClick={() => {
                setSearchQuery('')
                setDebouncedSearch('')
              }}
              className="mt-3 text-yellow-500 hover:text-yellow-400 font-medium text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Progress Section (collapsible) */}
      {hasProgress && (
        <div className="border-t border-[var(--border-subtle)] pt-6">
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="flex items-center gap-2 text-[var(--text-strong)] hover:text-yellow-500 transition-colors mb-4"
          >
            <h2 className="text-xl font-bold">Your Progress</h2>
            {showProgress ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          {showProgress && (
            <ProgressTimeline
              enrollments={enrollments}
              progress={progress}
              certificates={certificates}
              streak={streak}
            />
          )}
        </div>
      )}

      {/* Track Edit Modal */}
      {editingTrackId && (
        <TrackEditModal
          trackId={editingTrackId}
          open={!!editingTrackId}
          onOpenChange={(open) => {
            if (!open) setEditingTrackId(null)
          }}
          onTrackUpdated={() => {
            setEditingTrackId(null)
            startTransition(() => router.refresh())
          }}
          onTrackDeleted={() => {
            setEditingTrackId(null)
            startTransition(() => router.refresh())
          }}
        />
      )}

      {/* Upload Modal */}
      {isAdmin && (
        <UploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          tracks={allTracks.map(t => ({ id: t.id, title: t.title }))}
          onTrackCreated={() => {
            setUploadModalOpen(false)
            startTransition(() => router.refresh())
          }}
          onVideoUploaded={() => {
            startTransition(() => router.refresh())
          }}
        />
      )}
    </div>
  )
}
