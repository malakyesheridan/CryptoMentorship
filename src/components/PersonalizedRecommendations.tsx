'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  BookOpen, 
  Play, 
  Award,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { useSession } from 'next-auth/react'

interface Recommendation {
  id: string
  title: string
  excerpt?: string
  kind?: string
  slug: string
  coverUrl?: string
  publishedAt: Date
  tags: string[]
  score: number
  reason: string
  type: 'content' | 'episode' | 'track' | 'lesson'
  progressPct?: number
  trackTitle?: string
  trackSlug?: string
  sectionTitle?: string
}

interface PersonalizedRecommendationsProps {
  type?: 'all' | 'content' | 'episode' | 'track' | 'continue'
  limit?: number
  title?: string
  showRefresh?: boolean
  className?: string
}

export function PersonalizedRecommendations({ 
  type = 'all', 
  limit = 6, 
  title,
  showRefresh = true,
  className = '' 
}: PersonalizedRecommendationsProps) {
  const { data: session } = useSession()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('type', type)
      params.set('limit', limit.toString())

      const response = await fetch(`/api/recommendations?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, type, limit])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const getRecommendationIcon = (rec: Recommendation) => {
    switch (rec.type) {
      case 'content':
        return <BookOpen className="h-4 w-4 text-blue-500" />
      case 'episode':
        return <Play className="h-4 w-4 text-purple-500" />
      case 'track':
        return <Award className="h-4 w-4 text-yellow-500" />
      case 'lesson':
        return <Target className="h-4 w-4 text-green-500" />
      default:
        return <Sparkles className="h-4 w-4 text-orange-500" />
    }
  }

  const getRecommendationUrl = (rec: Recommendation) => {
    switch (rec.type) {
      case 'content':
        return `/content/${rec.slug}`
      case 'episode':
        return `/crypto-compass/${rec.slug}`
      case 'track':
        return `/learn/${rec.slug}`
      case 'lesson':
        return `/learn/${rec.trackSlug}/lesson/${rec.slug}`
      default:
        return '#'
    }
  }

  const getDefaultTitle = () => {
    switch (type) {
      case 'content':
        return 'Recommended Research'
      case 'episode':
        return 'Recommended Episodes'
      case 'track':
        return 'Recommended Learning Tracks'
      case 'continue':
        return 'Continue Learning'
      default:
        return 'Recommended for You'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            {title || getDefaultTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-slate-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            {title || getDefaultTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Failed to load recommendations</div>
            <Button onClick={fetchRecommendations} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            {title || getDefaultTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            No recommendations available at the moment.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            {title || getDefaultTitle()}
          </CardTitle>
          {showRefresh && (
            <Button 
              onClick={fetchRecommendations} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <CardDescription>
          Personalized recommendations based on your learning progress and interests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <Link key={rec.id} href={getRecommendationUrl(rec)}>
              <Card className="group hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-orange-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getRecommendationIcon(rec)}
                        <Badge variant="outline" className="text-xs">
                          {rec.type}
                        </Badge>
                      </div>
                      {rec.progressPct !== undefined && (
                        <div className="text-right">
                          <div className="text-xs font-medium">{rec.progressPct}%</div>
                          <div className="w-12 h-1 bg-slate-200 rounded-full">
                            <div 
                              className="h-1 bg-orange-500 rounded-full" 
                              style={{ width: `${rec.progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-sm leading-tight group-hover:text-orange-600 transition-colors">
                      {rec.title}
                    </h3>

                    {/* Track/Section info for lessons */}
                    {rec.trackTitle && (
                      <div className="text-xs text-slate-600">
                        {rec.sectionTitle ? `${rec.trackTitle} • ${rec.sectionTitle}` : rec.trackTitle}
                      </div>
                    )}

                    {/* Excerpt */}
                    {rec.excerpt && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {rec.excerpt}
                      </p>
                    )}

                    {/* Tags */}
                    {rec.tags && rec.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {rec.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {rec.tags.length > 2 && (
                          <span className="text-xs text-slate-500">
                            +{rec.tags.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{formatDate(rec.publishedAt)}</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-orange-600 font-medium">
                          {Math.round(rec.score)}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-slate-500 italic">
                      {rec.reason}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              View All Recommendations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
