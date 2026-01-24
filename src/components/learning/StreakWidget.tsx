'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Flame, 
  Target, 
  Play, 
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface StreakWidgetProps {
  streak: number
  totalLessonsCompleted: number
  nextLessonUrl?: string
  className?: string
}

export function StreakWidget({ 
  streak, 
  totalLessonsCompleted, 
  nextLessonUrl,
  className = '' 
}: StreakWidgetProps) {
  const getStreakMessage = (streak: number) => {
    if (streak === 0) {
      return "Start your learning streak today!"
    } else if (streak === 1) {
      return "Great start! Keep the momentum going."
    } else if (streak < 7) {
      return `You're on fire! ${streak} days in a row.`
    } else if (streak < 30) {
      return `Amazing dedication! ${streak} days strong.`
    } else {
      return `Incredible! ${streak} days of consistent learning.`
    }
  }

  const getStreakColor = (streak: number) => {
    if (streak === 0) return 'text-slate-500'
    if (streak < 7) return 'text-orange-500'
    if (streak < 30) return 'text-red-500'
    return 'text-yellow-500'
  }

  const getStreakBadge = (streak: number) => {
    if (streak === 0) return null
    if (streak < 7) return 'Hot'
    if (streak < 30) return 'On Fire'
    return 'Legendary'
  }

  const getNextMilestone = (streak: number) => {
    if (streak < 7) return { target: 7, label: '7 days' }
    if (streak < 30) return { target: 30, label: '30 days' }
    if (streak < 100) return { target: 100, label: '100 days' }
    return null
  }

  const nextMilestone = getNextMilestone(streak)
  const progressToNext = nextMilestone ? (streak / nextMilestone.target) * 100 : 100

  return (
    <Card className={cn('bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1 transition-all duration-300 transform-gpu', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4 group-hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Flame className="h-6 w-6 text-white group-hover:animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-700 transition-colors duration-300">Learning Streak</h3>
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-bold group-hover:scale-110 transition-transform duration-300', getStreakColor(streak))}>
                  {streak}
                </span>
                <span className="text-slate-600 group-hover:text-slate-700 transition-colors duration-300">days</span>
                {getStreakBadge(streak) && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 group-hover:scale-105 transition-transform duration-300">
                    {getStreakBadge(streak)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right group-hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-1 text-sm text-slate-600 mb-1 group-hover:text-slate-700 transition-colors duration-300">
              <Target className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              <span>Total Lessons</span>
            </div>
            <div className="text-lg font-semibold text-slate-900 group-hover:text-orange-700 transition-colors duration-300">
              {totalLessonsCompleted}
            </div>
          </div>
        </div>

        <p className="text-slate-700 mb-4 group-hover:text-slate-800 transition-colors duration-300">
          {getStreakMessage(streak)}
        </p>

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="mb-4 group-hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2 group-hover:text-slate-700 transition-colors duration-300">
              <span>Progress to {nextMilestone.label}</span>
              <span>{Math.round(progressToNext)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 group-hover:bg-slate-300 transition-colors duration-300">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300 group-hover:from-orange-600 group-hover:to-red-600"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 group-hover:scale-105 transition-transform duration-300">
          {nextLessonUrl ? (
            <Button asChild className="flex-1 group-hover:shadow-lg transition-all duration-300">
              <Link href={nextLessonUrl}>
                <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Continue Learning
              </Link>
            </Button>
          ) : (
            <Button asChild className="flex-1 group-hover:shadow-lg transition-all duration-300">
              <Link href="/learning">
                <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Start Learning
              </Link>
            </Button>
          )}
          
          <Button variant="outline" asChild className="group-hover:shadow-lg transition-all duration-300">
            <Link href="/learning">
              <TrendingUp className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
              View Progress
            </Link>
          </Button>
        </div>

        {/* Streak tips */}
        {streak === 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-300">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-blue-600 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-sm text-blue-800 group-hover:text-blue-900 transition-colors duration-300">
                <p className="font-medium mb-1">Pro tip:</p>
                <p>Complete at least one lesson each day to build your streak. Even 10 minutes counts!</p>
              </div>
            </div>
          </div>
        )}

        {streak > 0 && streak < 7 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-300">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-green-600 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-sm text-green-800 group-hover:text-green-900 transition-colors duration-300">
                <p className="font-medium mb-1">Keep it up!</p>
                <p>You&apos;re building great habits. Try to complete a lesson today to maintain your streak.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
