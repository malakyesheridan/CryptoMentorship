'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Trophy, 
  Flame, 
  Award, 
  Clock,
  TrendingUp,
  Target
} from 'lucide-react'

interface RealTimeProgressProps {
  userId: string
  trackId?: string
  showAchievements?: boolean
  showStreak?: boolean
  className?: string
}

interface ProgressData {
  lessonId?: string
  trackId?: string
  progressPct?: number
  completedLessons?: number
  totalLessons?: number
  completedAt?: string
  timeSpentMs?: number
}

interface AchievementData {
  type: 'lesson_completed' | 'track_completed' | 'streak_milestone' | 'certificate_earned'
  title: string
  description: string
  icon?: string
  streak?: number
  certificateId?: string
}

export function RealTimeProgress({ 
  userId, 
  trackId, 
  showAchievements = true, 
  showStreak = true,
  className = '' 
}: RealTimeProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({})
  const [achievements, setAchievements] = useState<AchievementData[]>([])
  const [streak, setStreak] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real progress data from API
  useEffect(() => {
    if (!trackId) {
      setIsLoading(false)
      return
    }

    const fetchProgress = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/learning/track-progress?trackId=${trackId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch progress')
        }

        const data = await response.json()
        
        setProgress({
          progressPct: data.progressPct,
          completedLessons: data.completedLessons,
          totalLessons: data.totalLessons,
          timeSpentMs: data.timeSpentMs,
        })
        setStreak(data.streak || 0)
      } catch (error) {
        console.error('Error fetching progress:', error)
        // Set empty progress on error
        setProgress({})
        setStreak(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProgress()

    // Refresh progress every 30 seconds
    const interval = setInterval(fetchProgress, 30000)
    return () => clearInterval(interval)
  }, [trackId])

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'track_completed':
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 'streak_milestone':
        return <Flame className="h-5 w-5 text-orange-500" />
      case 'certificate_earned':
        return <Award className="h-5 w-5 text-blue-500" />
      default:
        return <Target className="h-5 w-5 text-gray-500" />
    }
  }

  const formatTimeSpent = (timeSpentMs: number) => {
    const minutes = Math.floor(timeSpentMs / 60000)
    const seconds = Math.floor((timeSpentMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Display */}
      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Loading progress...</div>
          </CardContent>
        </Card>
      ) : progress.progressPct !== undefined && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Learning Progress</h3>
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{progress.progressPct}%</span>
                </div>
                <Progress value={progress.progressPct} className="h-2" />
                
                {progress.completedLessons !== undefined && progress.totalLessons !== undefined && (
                  <div className="text-xs text-slate-500">
                    {progress.completedLessons} of {progress.totalLessons} lessons completed
                  </div>
                )}
                
                {progress.timeSpentMs && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    Time spent: {formatTimeSpent(progress.timeSpentMs)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Streak */}
      {showStreak && streak > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-orange-500" />
              <div>
                <div className="font-semibold text-sm">{streak} Day Streak</div>
                <div className="text-xs text-slate-500">Keep it up!</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {showAchievements && achievements.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">Recent Achievements</h3>
            <div className="space-y-2">
              {achievements.map((achievement, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-slate-50">
                  {getAchievementIcon(achievement.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{achievement.title}</div>
                    <div className="text-xs text-slate-600">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
