'use client'

import { useState, useMemo } from 'react'
import { LearningHubTabs } from './LearningHubTabs'
import { ContentGrid } from './ContentGrid'
import { CourseCarousel } from './CourseCarousel'
import { CourseRecommendations } from './CourseRecommendations'
import { CourseSearch } from './CourseSearch'
import { EnhancedStats } from './EnhancedStats'
import { StreakWidget } from './StreakWidget'
import { SmartNotifications } from './SmartNotifications'
import { ProgressTimeline } from './ProgressTimeline'
import { RealTimeProgress } from './RealTimeProgress'
import { LearningAnalytics } from './LearningAnalytics'
import AdminResourceUploadWrapper from '@/components/AdminResourceUploadWrapper'
import { Suspense } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Filter, Flame, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, FileText, BarChart3, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { formatContentDate, canViewContent } from '@/lib/content-utils'
import { formatDate } from '@/lib/dates'
import Image from 'next/image'

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
  const [activeTab, setActiveTab] = useState<TabType>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [contentFilter, setContentFilter] = useState<'all' | 'courses' | 'resources'>('all')

  // Transform data for content grid
  const courseItems = useMemo(() => transformEnrollmentsToContent(enrollments), [enrollments])
  const resourceItems = useMemo(() => transformResourcesToContent(resources, userRole, userTier), [resources, userRole, userTier])
  
  // Combine for discover tab
  const allContentItems = useMemo(() => {
    const courses = courseItems.map(item => ({ ...item, type: 'course' as const }))
    const res = resourceItems.map(item => ({ ...item, type: 'resource' as const }))
    return [...courses, ...res]
  }, [courseItems, resourceItems])

  // Filter content based on search and filters
  const filteredContent = useMemo(() => {
    let filtered = allContentItems
    
    // Apply content type filter (for discover tab only)
    if (activeTab === 'discover' && contentFilter !== 'all') {
      // Map 'resources'/'courses' to 'resource'/'course'
      const mappedFilter = contentFilter === 'resources' ? 'resource' : contentFilter === 'courses' ? 'course' : contentFilter
      filtered = filtered.filter(item => item.type === mappedFilter)
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [activeTab, allContentItems, courseItems, resourceItems, contentFilter, searchQuery])

  // Stats for tabs
  const tabStats = {
    courses: enrollments.length,
    resources: resources.length
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

      {/* Search and Filters (for Discover tab) */}
      {activeTab === 'discover' && (
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search courses and resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={contentFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setContentFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={contentFilter === 'courses' ? 'default' : 'outline'}
                onClick={() => setContentFilter('courses')}
                size="sm"
              >
                Courses
              </Button>
              <Button
                variant={contentFilter === 'resources' ? 'default' : 'outline'}
                onClick={() => setContentFilter('resources')}
                size="sm"
              >
                Resources
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'discover' && (
        <div className="space-y-8">
          {/* Continue Learning Section */}
          {enrollments.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Continue Learning</h2>
              <CourseCarousel courses={enrollments.map((enrollment) => {
                const track = enrollment.track
                const totalLessons = track.lessons?.length || 0
                
                return {
                  id: track.id,
                  slug: track.slug,
                  title: track.title,
                  summary: track.summary || '',
                  coverUrl: track.coverUrl || '',
                  progressPct: enrollment.progressPct,
                  startedAt: enrollment.startedAt,
                  totalLessons,
                  completedLessons: Math.round((enrollment.progressPct / 100) * totalLessons),
                  completedAt: enrollment.completedAt || null
                }
              })} />
            </div>
          )}

          {/* Recommended Learning Tracks */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Recommended Learning Tracks</h2>
            <CourseRecommendations courses={allCourses} />
          </div>

          {/* All Content Grid */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">All Content</h2>
            <p className="text-sm text-slate-600 mb-4">
              Browse learning tracks (structured courses) and resources (standalone content)
            </p>
            <ContentGrid 
              items={filteredContent}
              showProgress={true}
            />
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
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Learning Analytics
            </h2>
            <Suspense fallback={<div className="text-center py-8">Loading analytics...</div>}>
              <LearningAnalytics />
            </Suspense>
          </div>

          {/* Certificates */}
          {certificates.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Certificates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((certificate) => (
                  <Card key={certificate.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                          <Award className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-900">{certificate.track.title}</CardTitle>
                          <CardDescription className="text-slate-600">
                            Completed {formatDate(certificate.issuedAt, 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/learn/cert/${certificate.code}`}>
                        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                          <Award className="h-4 w-4 mr-2" />
                          View Certificate
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

