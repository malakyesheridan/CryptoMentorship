'use client'

import { CircularProgress } from './CircularProgress'
import { ActivityChart } from './ActivityChart'
import { BookmarksGrid } from './BookmarksGrid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BookOpen, Award, Target } from 'lucide-react'
import Link from 'next/link'

interface ActivityData {
  date: string
  count: number
}

interface SavedItem {
  type: 'content' | 'episode'
  slug: string
  title: string
  coverUrl?: string | null
  savedAt: Date
}

interface DashboardStatsProps {
  totalEnrollments: number
  completedTracks: number
  totalLessonsCompleted: number
  totalCertificates: number
  learningActivity: ActivityData[]
  bookmarks?: SavedItem[]
  showActivityChart?: boolean
  showBookmarks?: boolean
  className?: string
}

export function DashboardStats({
  totalEnrollments,
  completedTracks,
  totalLessonsCompleted,
  totalCertificates,
  learningActivity,
  bookmarks = [],
  showActivityChart = false,
  showBookmarks = false,
  className = ''
}: DashboardStatsProps) {
  // Calculate overall progress percentage
  const overallProgress = totalEnrollments > 0 
    ? Math.round((completedTracks / totalEnrollments) * 100) 
    : 0

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <Link href="/learning" className="group">
        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu">
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors duration-300">Learning Tracks</h3>
            <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-300">Structured courses</p>
          </CardContent>
        </Card>
      </Link>
      
      <Link href="/learning" className="group">
        <Card className="group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
              <CircularProgress 
                progress={overallProgress}
                size={32}
                strokeWidth={3}
                color="#16a34a" // green-600
                showPercentage={false}
                animated={true}
              />
              <Activity className="h-8 w-8 text-green-600 ml-2 group-hover:text-green-700 transition-colors duration-300" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-green-700 transition-colors duration-300">My Progress</h3>
            <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
              {completedTracks} of {totalEnrollments} completed
            </p>
            {showActivityChart && (
              <div className="mt-3 group-hover:scale-105 transition-transform duration-300">
                <ActivityChart 
                  data={learningActivity}
                  height={40}
                  color="#16a34a"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
      
      <div className="md:col-span-3">
        <Card className="group-hover:shadow-xl group-hover:scale-[1.01] transition-all duration-300 transform-gpu">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 group-hover:scale-105 transition-transform duration-300">
                <Award className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" />
                <h3 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors duration-300">Saved Content</h3>
              </div>
              <Link href="/me/saved" className="text-sm text-purple-600 hover:text-purple-700 transition-colors duration-300 group-hover:scale-105 transform-gpu">
                View All
              </Link>
            </div>
            {showBookmarks ? (
              <div className="group-hover:scale-[1.02] transition-transform duration-300">
                <BookmarksGrid 
                  bookmarks={bookmarks} 
                  maxItems={3}
                  showRemoveButton={true}
                />
              </div>
            ) : (
              <div className="text-center py-4 group-hover:scale-105 transition-transform duration-300">
                <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-300">Bookmarked items</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
