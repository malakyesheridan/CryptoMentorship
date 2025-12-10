'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Award, 
  Target,
  Calendar,
  BookOpen,
  Trophy,
  Flame,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { json } from '@/lib/http'

interface AnalyticsData {
  overview: {
    totalEnrollments: number
    completedTracks: number
    totalLessonsCompleted: number
    totalTimeSpent: number
    certificates: number
    streak: number
  }
  recentActivity: Array<{
    id: string
    completedAt: string | Date
    lesson: {
      title: string
      track: {
        title: string
        slug: string
      }
    }
  }>
  progressOverTime: Array<{
    date: string
    lessonsCompleted: number
    timeSpent: number
  }>
  topTracks: Array<{
    trackId: string
    trackTitle: string
    trackSlug: string
    progressPct: number
    startedAt: string | Date
    completedAt: string | Date | null
  }>
}

interface LearningAnalyticsProps {
  trackId?: string
  className?: string
}

export function LearningAnalytics({ trackId, className = '' }: LearningAnalyticsProps) {
  const { data: session } = useSession()
  const [timeframe, setTimeframe] = useState('30d')

  // Build analytics API URL
  const analyticsKey = session?.user?.id
    ? `/api/learning/analytics?type=${trackId ? 'track' : 'overview'}&timeframe=${timeframe}${trackId ? `&trackId=${trackId}` : ''}`
    : null

  // Use SWR for data fetching with automatic caching and revalidation
  const { data: analytics, error, isLoading: loading, mutate } = useSWR<AnalyticsData>(
    analyticsKey,
    (url) => json<AnalyticsData>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000
    }
  )

  const formatTimeSpent = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (date: string | Date) => {
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // Helper to convert date to ISO string safely
  const toISOString = (date: string | Date | null | undefined): string => {
    if (!date) return new Date().toISOString()
    if (date instanceof Date) return date.toISOString()
    // If it's already a string, check if it's a valid ISO string
    if (typeof date === 'string') {
      // If it's already an ISO string, return it
      if (date.includes('T') || date.includes('Z')) {
        return date
      }
      // Otherwise, convert it
      return new Date(date).toISOString()
    }
    return new Date().toISOString()
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-8 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-2">
            {error instanceof Error ? error.message : 'Failed to load analytics'}
          </div>
          <Button onClick={() => mutate()} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analytics && !loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="text-slate-500 mb-2">No analytics data available</div>
          <Button onClick={() => mutate()} variant="outline" size="sm">
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) return null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Learning Analytics</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Enrollments</p>
                <p className="text-2xl font-bold">{analytics.overview.totalEnrollments}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed Tracks</p>
                <p className="text-2xl font-bold">{analytics.overview.completedTracks}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Lessons Completed</p>
                <p className="text-2xl font-bold">{analytics.overview.totalLessonsCompleted}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Learning Streak */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Flame className="h-12 w-12 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold">Learning Streak</h3>
              <p className="text-3xl font-bold text-orange-600">{analytics.overview.streak} days</p>
              <p className="text-sm text-slate-600">Keep up the great work!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Tracks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Performing Tracks
          </CardTitle>
          <CardDescription>Your most progressed learning tracks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topTracks.map((track) => (
              <div key={track.trackId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{track.trackTitle}</h4>
                  <p className="text-sm text-slate-600">
                    Started {formatDate(toISOString(track.startedAt))}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{track.progressPct}%</div>
                  <Progress value={track.progressPct} className="w-24 h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest learning achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">{activity.lesson.title}</p>
                  <p className="text-sm text-slate-600">{activity.lesson.track.title}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDate(toISOString(activity.completedAt))}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Progress Over Time
          </CardTitle>
          <CardDescription>Your learning activity in the last {timeframe}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.progressOverTime.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center justify-between p-2">
                <span className="text-sm font-medium">{formatDate(day.date)}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    {day.lessonsCompleted} lessons
                  </span>
                  <span className="text-sm text-slate-600">
                    {formatTimeSpent(day.timeSpent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
