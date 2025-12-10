'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { LearningHubTabs } from './LearningHubTabs'
import { ContentGrid } from './ContentGrid'
import { TrackEditModal } from './TrackEditModal'
import { UploadModal } from './UploadModal'
import { EnhancedStats } from './EnhancedStats'
import { ProgressTimeline } from './ProgressTimeline'
import { RealTimeProgress } from './RealTimeProgress'
import { LearningAnalytics } from './LearningAnalytics'
import { Suspense } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Flame, BarChart3, Award, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Video, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

type TabType = 'discover' | 'progress'

interface LearningHubContentProps {
  // Data
  enrollments: any[]
  progress: any[]
  certificates: any[]
  learningActivity: any[]
  allCourses: any[]
  enhancedMetrics: any
  resources: any[]
  streak: number
  
  // User info
  userId: string
  userRole: string
  userTier: string | null
}

// Transform enrollments to content items
function transformEnrollmentsToContent(enrollments: any[]) {
  return enrollments.map((enrollment) => {
    const track = enrollment.track
    const totalLessons = track.lessons?.length || 0
    const totalDuration = track.lessons?.reduce((sum: number, lesson: any) => sum + (lesson.durationMin || 0), 0) || 0
    
    return {
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.summary,
      coverUrl: track.coverUrl,
      type: 'course' as const,
      locked: false,
      progressPct: enrollment.progressPct,
      publishedAt: track.publishedAt,
      durationMin: totalDuration,
      totalLessons,
    }
  })
}

// Transform resources to content items
function transformResourcesToContent(resources: any[], userRole: string, userTier: string | null) {
  return resources.map((resource) => ({
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    description: resource.description,
    coverUrl: resource.coverUrl,
    type: 'resource' as const,
    locked: resource.locked,
    publishedAt: resource.publishedAt,
    tags: resource.tags,
    url: `/content/${resource.slug || resource.id}`,
  }))
}

export function LearningHubContent({
  enrollments,
  progress,
  certificates,
  learningActivity,
  allCourses,
  enhancedMetrics,
  resources,
  streak,
  userId,
  userRole,
  userTier
}: LearningHubContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [contentFilter, setContentFilter] = useState<'all' | 'courses' | 'resources'>('all')
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  

  // Transform data for content grid
  const courseItems = useMemo(() => transformEnrollmentsToContent(enrollments), [enrollments])
  
  // For admins, also include all published tracks (not just enrolled ones)
  const allTracksForAdmin = useMemo(() => {
    if (userRole !== 'admin' && userRole !== 'editor') return courseItems
    // Combine enrolled tracks with all published tracks
    const enrolledIds = new Set(courseItems.map(c => c.id))
    const additionalTracks = allCourses
      .filter((c: any) => !enrolledIds.has(c.id))
      .map((c: any) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        coverUrl: c.coverUrl,
        type: 'course' as const,
        locked: false,
        progressPct: 0,
        publishedAt: c.publishedAt,
      }))
    return [...courseItems, ...additionalTracks]
  }, [courseItems, allCourses, userRole])

  // Filter content based on search
  const filteredTracks = useMemo(() => {
    let filtered = allTracksForAdmin
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [allTracksForAdmin, searchQuery])

  // Stats for tabs
  const tabStats = {
    courses: allTracksForAdmin.length,
    resources: 0
  }

  return (
    <div className="space-y-8">
      {/* Learning Streak */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-yellow-500 rounded-xl flex items-center justify-center">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Learning Streak</h3>
              <p className="text-slate-600">
                {streak} day{streak !== 1 ? 's' : ''} in a row! Keep it up!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <LearningHubTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        stats={tabStats}
      />

      {/* Search (for Discover tab) */}
      {activeTab === 'discover' && (
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search learning tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'discover' && (
        <div className="space-y-8">
          {/* Admin: Upload Button */}
          {(userRole === 'admin' || userRole === 'editor') && (
            <div className="flex justify-end">
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          )}

          {/* All Learning Tracks */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {filteredTracks.length === 0 ? 'No Learning Tracks' : 'Learning Tracks'}
            </h2>
            {filteredTracks.length > 0 ? (
              <ContentGrid 
                items={filteredTracks}
                showProgress={true}
                userRole={userRole}
                onEditTrack={(trackId) => setEditingTrackId(trackId)}
              />
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p>No learning tracks found.</p>
                {(userRole === 'admin' || userRole === 'editor') && (
                  <p className="text-sm mt-2">Create your first track above!</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-8">
          {/* Progress Timeline */}
          <ProgressTimeline 
            enrollments={enrollments}
            progress={progress}
            certificates={certificates}
            streak={streak}
          />

          {/* Real-Time Progress */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-green-600" />
              Live Progress
            </h2>
            <RealTimeProgress 
              userId={userId}
              showAchievements={true}
              showStreak={true}
            />
          </div>

          {/* Analytics Section */}
          <Suspense fallback={<div className="text-center py-8">Loading analytics...</div>}>
            <LearningAnalytics />
          </Suspense>

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
          onTrackUpdated={async () => {
            // Close the modal
            setEditingTrackId(null)
            // Refresh server-side data (will revalidate cache)
            router.refresh()
          }}
          onTrackDeleted={() => {
            // Close modal and refresh - but defer to avoid React errors
            setEditingTrackId(null)
            // Defer refresh to avoid state updates during render
            requestAnimationFrame(() => {
              setTimeout(() => {
                router.refresh()
              }, 100)
            })
          }}
        />
      )}

      {/* Upload Modal */}
      {(userRole === 'admin' || userRole === 'editor') && (
        <UploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          tracks={allTracksForAdmin.map(t => ({ id: t.id, title: t.title }))}
          onTrackCreated={() => {
            // Close modal and refresh tracks list
            setUploadModalOpen(false)
            // Refresh server-side data (will revalidate cache)
            router.refresh()
          }}
          onVideoUploaded={() => {
            // Keep modal open for multiple uploads, just refresh tracks
            // Refresh server-side data (will revalidate cache)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

