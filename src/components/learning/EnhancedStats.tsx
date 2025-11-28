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
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConsistencyBadge = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' }
    if (score >= 60) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800 border-red-200' }
  }

  const consistencyBadge = getConsistencyBadge(enhancedMetrics.consistencyScore)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Basic Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Link href="/learn" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 group-hover:scale-110 transition-all duration-300">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300 text-sm sm:text-base">Started Tracks</h3>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">{totalEnrollments}</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800 group-hover:scale-110 transition-all duration-300">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors duration-300 text-sm sm:text-base">Completed Tracks</h3>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors duration-300">{completedTracks}</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800 group-hover:scale-110 transition-all duration-300">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300 text-sm sm:text-base">Lessons Completed</h3>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">{totalLessonsCompleted}</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/learning" className="group">
          <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800 group-hover:scale-110 transition-all duration-300">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors duration-300 text-sm sm:text-base">Certificates</h3>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors duration-300">{totalCertificates}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Enhanced Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 group-hover:scale-110 transition-all duration-300">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 group-hover:scale-105 transition-transform duration-300 text-xs">
                This Week
              </Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Learning Velocity</h3>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 group-hover:text-orange-700 transition-colors duration-300">
              {enhancedMetrics.learningVelocity}
            </p>
            <p className="text-xs text-slate-500 mt-1">lessons completed</p>
          </CardContent>
        </Card>

        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 group-hover:scale-110 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <Badge variant="secondary" className={cn('group-hover:scale-105 transition-transform duration-300 text-xs', consistencyBadge.color)}>
                {consistencyBadge.text}
              </Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Consistency Score</h3>
            <p className={cn('text-lg sm:text-2xl font-bold group-hover:scale-110 transition-transform duration-300', getConsistencyColor(enhancedMetrics.consistencyScore))}>
              {enhancedMetrics.consistencyScore}%
            </p>
            <p className="text-xs text-slate-500 mt-1">{enhancedMetrics.totalDays} active days</p>
          </CardContent>
        </Card>

        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 group-hover:scale-110 transition-all duration-300">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 group-hover:scale-105 transition-transform duration-300 text-xs">
                Retention
              </Badge>
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Retention Rate</h3>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors duration-300">
              {enhancedMetrics.retentionRate}%
            </p>
            <p className="text-xs text-slate-500 mt-1">knowledge retention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
