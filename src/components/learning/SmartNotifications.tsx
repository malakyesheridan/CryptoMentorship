'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell,
  BellOff,
  Clock,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Settings,
  CheckCircle,
  X,
  Zap,
  Star,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'reminder' | 'achievement' | 'streak' | 'recommendation'
  title: string
  message: string
  icon: React.ReactNode
  color: string
  action?: {
    label: string
    href: string
  }
  timestamp: Date
  read: boolean
}

interface SmartNotificationsProps {
  streak: number
  totalLessonsCompleted: number
  completedTracks: number
  nextLessonUrl?: string
  className?: string
}

export function SmartNotifications({ 
  streak, 
  totalLessonsCompleted, 
  completedTracks, 
  nextLessonUrl,
  className = '' 
}: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date>(new Date())

  const generateNotifications = useCallback(() => {
    const newNotifications: Notification[] = []
    const now = new Date()
    
    // Streak notifications
    if (streak === 0) {
      newNotifications.push({
        id: 'streak-start',
        type: 'reminder',
        title: 'Start Your Learning Streak',
        message: 'Complete your first lesson today to begin your learning streak!',
        icon: <Zap className="h-4 w-4" />,
        color: 'bg-orange-500',
        action: nextLessonUrl ? {
          label: 'Start Learning',
          href: nextLessonUrl
        } : {
          label: 'Browse Courses',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    } else if (streak === 1) {
      newNotifications.push({
        id: 'streak-continue',
        type: 'reminder',
        title: 'Keep Your Streak Going',
        message: 'Great start! Complete another lesson today to maintain your streak.',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'bg-green-500',
        action: nextLessonUrl ? {
          label: 'Continue Learning',
          href: nextLessonUrl
        } : {
          label: 'Browse Courses',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    } else if (streak >= 7 && streak < 30) {
      newNotifications.push({
        id: 'streak-milestone',
        type: 'achievement',
        title: 'Amazing Streak!',
        message: `You've maintained a ${streak}-day learning streak. Keep it up!`,
        icon: <Star className="h-4 w-4" />,
        color: 'bg-purple-500',
        action: nextLessonUrl ? {
          label: 'Continue Learning',
          href: nextLessonUrl
        } : {
          label: 'Browse Courses',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    }

    // Lesson completion notifications
    if (totalLessonsCompleted === 0) {
      newNotifications.push({
        id: 'first-lesson',
        type: 'reminder',
        title: 'Complete Your First Lesson',
        message: 'Start your learning journey by completing your first lesson.',
        icon: <Target className="h-4 w-4" />,
        color: 'bg-blue-500',
        action: nextLessonUrl ? {
          label: 'Start Learning',
          href: nextLessonUrl
        } : {
          label: 'Browse Courses',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    } else if (totalLessonsCompleted === 10) {
      newNotifications.push({
        id: 'milestone-10',
        type: 'achievement',
        title: '10 Lessons Completed!',
        message: 'Congratulations! You\'ve completed 10 lessons. You\'re making great progress!',
        icon: <Award className="h-4 w-4" />,
        color: 'bg-yellow-500',
        action: {
          label: 'View Progress',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    }

    // Course completion notifications
    if (completedTracks > 0) {
      newNotifications.push({
        id: 'course-completion',
        type: 'achievement',
        title: 'Course Completed!',
        message: `Congratulations! You've completed ${completedTracks} course${completedTracks > 1 ? 's' : ''}.`,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-green-500',
        action: {
          label: 'View Certificates',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    }

    // Daily reminder (if no activity today)
    const today = new Date().toDateString()
    const hasActivityToday = false // This would be determined by checking today's progress
    
    if (!hasActivityToday && streak > 0) {
      newNotifications.push({
        id: 'daily-reminder',
        type: 'reminder',
        title: 'Don\'t Break Your Streak!',
        message: 'Complete a lesson today to maintain your learning streak.',
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-red-500',
        action: nextLessonUrl ? {
          label: 'Continue Learning',
          href: nextLessonUrl
        } : {
          label: 'Browse Courses',
          href: '/learning'
        },
        timestamp: now,
        read: false
      })
    }

    return newNotifications
  }, [streak, totalLessonsCompleted, completedTracks, nextLessonUrl])

  useEffect(() => {
    if (notificationsEnabled) {
      const newNotifications = generateNotifications()
      setNotifications(prev => {
        // Only add notifications that don't already exist
        const existingIds = new Set(prev.map(n => n.id))
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id))
        return [...prev, ...uniqueNew].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      })
    }
  }, [notificationsEnabled, generateNotifications])

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!notificationsEnabled) {
    return (
      <Card className={cn('bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200', className)}>
        <CardContent className="p-6 text-center">
          <BellOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Notifications Disabled</h3>
          <p className="text-slate-600 mb-4">Enable notifications to get learning reminders and achievements</p>
          <Button onClick={() => setNotificationsEnabled(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Enable Notifications
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-blue-900">Smart Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationsEnabled(false)}
              className="text-slate-600 hover:text-slate-800"
            >
              <BellOff className="h-4 w-4" />
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-slate-600 hover:text-slate-800"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
        <p className="text-blue-700 text-sm">
          Personalized learning reminders and achievements
        </p>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-600">No new notifications. Keep up the great work!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg transition-all duration-300 group',
                  notification.read ? 'bg-slate-50' : 'bg-white shadow-sm'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
                  notification.color
                )}>
                  {notification.icon}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className={cn(
                      'font-semibold text-sm',
                      notification.read ? 'text-slate-600' : 'text-slate-900'
                    )}>
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <X className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  
                  <p className={cn(
                    'text-xs mb-2',
                    notification.read ? 'text-slate-500' : 'text-slate-600'
                  )}>
                    {notification.message}
                  </p>
                  
                  {notification.action && (
                    <Link 
                      href={notification.action.href}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {notification.action.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {notifications.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" className="group-hover:scale-105 transition-transform duration-300">
              <Bell className="h-4 w-4 mr-2" />
              View All Notifications ({notifications.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
