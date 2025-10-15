'use client'

import { useState, useEffect } from 'react'
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
    completedAt: Date
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
    startedAt: Date
    completedAt: Date | null
  }>
}

interface LearningAnalyticsProps {
  trackId?: string
  className?: string
}

export function LearningAnalytics({ trackId, className = '' }: LearningAnalyticsProps) {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30d')
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('type', trackId ? 'track' : 'overview')
      params.set('timeframe', timeframe)
      if (trackId) params.set('trackId', trackId)

      const response = await fetch(`/api/learning/analytics?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [session?.user?.id, timeframe, trackId])

  const formatTimeSpent = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
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
          <div className="text-red-500 mb-2">Failed to load analytics</div>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            Try Again
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Time Spent</p>
                <p className="text-2xl font-bold">{formatTimeSpent(analytics.overview.totalTimeSpent)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
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
                    Started {formatDate(track.startedAt.toISOString())}
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
                  {formatDate(activity.completedAt.toISOString())}
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
