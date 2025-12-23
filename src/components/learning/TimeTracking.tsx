'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  Play, 
  Pause, 
  Square,
  Timer,
  BarChart3,
  TrendingUp,
  Calendar,
  Target,
  Activity
} from 'lucide-react'
import { startLearningSession, endLearningSession, getLessonTimeTracking } from '@/lib/actions/time-tracking'
import { formatDateTime } from '@/lib/dates'

interface TimeTrackingProps {
  lessonId: string
  userId: string
  className?: string
}

interface SessionData {
  id: string
  startTime: Date
  endTime?: Date | null
  timeSpentMs: number
  sessionType: string
  createdAt: Date
  updatedAt: Date
  userId: string
  lessonId: string
}

interface TimeTrackingData {
  sessions: SessionData[]
  totalTimeSpent: number
  activeSession?: SessionData
  sessionCount: number
}

export function TimeTracking({ lessonId, userId, className = '' }: TimeTrackingProps) {
  const [timeTracking, setTimeTracking] = useState<TimeTrackingData | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch time tracking data
  const fetchTimeTracking = async () => {
    try {
      const data = await getLessonTimeTracking(userId, lessonId)
      setTimeTracking(data)
      setIsTracking(!!data.activeSession)
      
      if (data.activeSession) {
        const startTime = new Date(data.activeSession.startTime).getTime()
        const now = Date.now()
        setCurrentTime(now - startTime)
      }
    } catch (error) {
      console.error('Error fetching time tracking:', error)
    }
  }

  useEffect(() => {
    fetchTimeTracking()
  }, [lessonId, userId])

  // Start tracking
  const handleStartTracking = async () => {
    try {
      setLoading(true)
      const session = await startLearningSession(lessonId, 'lesson')
      setIsTracking(true)
      setCurrentTime(0)
      
      // Start interval to update current time
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1000)
      }, 1000)
      
      await fetchTimeTracking()
    } catch (error) {
      console.error('Error starting tracking:', error)
    } finally {
      setLoading(false)
    }
  }

  // Stop tracking
  const handleStopTracking = async () => {
    if (!timeTracking?.activeSession) return

    try {
      setLoading(true)
      await endLearningSession(timeTracking.activeSession.id)
      setIsTracking(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      await fetchTimeTracking()
    } catch (error) {
      console.error('Error stopping tracking:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format time display
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Format date
  const formatDate = (date: Date) => {
    return formatDateTime(date)
  }

  // Calculate average session time
  const averageSessionTime = timeTracking && timeTracking.sessionCount > 0 
    ? timeTracking.totalTimeSpent / timeTracking.sessionCount 
    : 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <CardDescription>Track your learning time for this lesson</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Time Display */}
            <div className="text-center p-6 bg-slate-50 rounded-lg">
              <div className="text-3xl font-bold text-slate-900">
                {formatTime(isTracking ? currentTime : (timeTracking?.totalTimeSpent || 0))}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {isTracking ? 'Currently Learning' : 'Total Time Spent'}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-3">
              {!isTracking ? (
                <Button 
                  onClick={handleStartTracking} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Learning
                </Button>
              ) : (
                <Button 
                  onClick={handleStopTracking} 
                  disabled={loading}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Learning
                </Button>
              )}
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-slate-600">
                {isTracking ? 'Tracking Active' : 'Not Tracking'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Statistics */}
      {timeTracking && timeTracking.sessionCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Session Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-lg font-semibold">{timeTracking.sessionCount}</div>
                <div className="text-sm text-slate-600">Total Sessions</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-lg font-semibold">{formatTime(averageSessionTime)}</div>
                <div className="text-sm text-slate-600">Avg Session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {timeTracking && timeTracking.sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription>Your recent learning sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeTracking.sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${session.endTime ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <div>
                      <div className="text-sm font-medium">
                        {formatDate(session.startTime)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {session.sessionType} session
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatTime(session.timeSpentMs)}
                    </div>
                    {session.endTime && (
                      <div className="text-xs text-slate-600">
                        Completed
                      </div>
                    )}
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
