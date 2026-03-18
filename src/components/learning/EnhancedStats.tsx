'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Award,
  Calendar,
  Zap,
  BarChart3,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EnhancedMetrics {
  learningVelocity: number
  totalTimeSpent: number
  consistencyScore: number
  retentionRate: number
  totalDays: number
}

interface EnhancedStatsProps {
  totalEnrollments: number
  completedTracks: number
  totalLessonsCompleted: number
  totalCertificates: number
  enhancedMetrics: EnhancedMetrics
  className?: string
}

export function EnhancedStats({
  totalEnrollments,
  completedTracks,
  totalLessonsCompleted,
  totalCertificates,
  enhancedMetrics,
  className = ''
}: EnhancedStatsProps) {
  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-[#4a7c3f]'
    if (score >= 60) return 'text-yellow-600'
    return 'text-[#c03030]'
  }

  const getConsistencyBadge = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'bg-[#1a2e1a] text-[#4a7c3f] border-[#1a2e1a]' }
    if (score >= 60) return { text: 'Good', color: 'bg-[#2a2418] text-[#c9a227] border-[#2a2418]' }
    return { text: 'Needs Improvement', color: 'bg-[#2e1a1a] text-[#c03030] border-[#2e1a1a]' }
  }

  const consistencyBadge = getConsistencyBadge(enhancedMetrics.consistencyScore)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Basic Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-[#1a1d2e] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#1a1d2e] group-hover:scale-110 transition-all duration-300">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-[var(--text-strong)] mb-2 group-hover:text-[#5b8dd9] transition-colors duration-300 text-sm sm:text-base">Started Tracks</h3>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 group-hover:text-[#5b8dd9] transition-colors duration-300">{totalEnrollments}</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-[#1a2e1a] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#1a2e1a] group-hover:scale-110 transition-all duration-300">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-[#4a7c3f]" />
              </div>
              <h3 className="font-semibold text-[var(--text-strong)] mb-2 group-hover:text-[#4a7c3f] transition-colors duration-300 text-sm sm:text-base">Completed Tracks</h3>
              <p className="text-xl sm:text-2xl font-bold text-[#4a7c3f] group-hover:text-[#4a7c3f] transition-colors duration-300">{completedTracks}</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-[#231a2e] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#231a2e] group-hover:scale-110 transition-all duration-300">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-[var(--text-strong)] mb-2 group-hover:text-purple-700 transition-colors duration-300 text-sm sm:text-base">Lessons Completed</h3>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors duration-300">{totalLessonsCompleted}</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-[#2a2418] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#2a2418] group-hover:scale-110 transition-all duration-300">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-[var(--text-strong)] mb-2 group-hover:text-yellow-700 transition-colors duration-300 text-sm sm:text-base">Certificates</h3>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 group-hover:text-yellow-700 transition-colors duration-300">{totalCertificates}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Enhanced Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-[#2a2018] rounded-lg flex items-center justify-center group-hover:bg-[#2a2018] group-hover:scale-110 transition-all duration-300">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-[#2a2018] text-[#d97706] border-[#2a2018] group-hover:scale-105 transition-transform duration-300 text-xs">
                This Week
              </Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-[var(--text-strong)] mb-1">Learning Velocity</h3>
            <p className="text-lg sm:text-2xl font-bold text-[var(--text-strong)] group-hover:text-orange-700 transition-colors duration-300">
              {enhancedMetrics.learningVelocity}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">lessons completed</p>
          </CardContent>
        </Card>

        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-[#1a2e1a] rounded-lg flex items-center justify-center group-hover:bg-[#1a2e1a] group-hover:scale-110 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#4a7c3f]" />
              </div>
              <Badge variant="secondary" className={cn('group-hover:scale-105 transition-transform duration-300 text-xs', consistencyBadge.color)}>
                {consistencyBadge.text}
              </Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-[var(--text-strong)] mb-1">Consistency Score</h3>
            <p className={cn('text-lg sm:text-2xl font-bold group-hover:scale-110 transition-transform duration-300', getConsistencyColor(enhancedMetrics.consistencyScore))}>
              {enhancedMetrics.consistencyScore}%
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{enhancedMetrics.totalDays} active days</p>
          </CardContent>
        </Card>

        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-[#231a2e] rounded-lg flex items-center justify-center group-hover:bg-[#231a2e] group-hover:scale-110 transition-all duration-300">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-[#231a2e] text-[#a78bfa] border-[#231a2e] group-hover:scale-105 transition-transform duration-300 text-xs">
                Retention
              </Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-[var(--text-strong)] mb-1">Retention Rate</h3>
            <p className="text-lg sm:text-2xl font-bold text-[var(--text-strong)] group-hover:text-purple-700 transition-colors duration-300">
              {enhancedMetrics.retentionRate}%
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">knowledge retention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
