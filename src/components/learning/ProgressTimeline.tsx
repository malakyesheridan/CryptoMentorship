'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  Award,
  Target,
  Clock,
  TrendingUp,
  Star,
  CheckCircle,
  ArrowRight,
  Trophy,
  BookOpen,
  Play
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Milestone {
  id: string
  type: 'enrollment' | 'completion' | 'certificate' | 'streak' | 'achievement'
  title: string
  description: string
  date: Date
  icon: React.ReactNode
  color: string
  badge?: string
  link?: string
}

interface ProgressTimelineProps {
  enrollments: any[]
  progress: any[]
  certificates: any[]
  streak: number
  className?: string
}

export function ProgressTimeline({ 
  enrollments, 
  progress, 
  certificates, 
  streak, 
  className = '' 
}: ProgressTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)

  const milestones = useMemo(() => {
    const allMilestones: Milestone[] = []

    // Add enrollment milestones
    enrollments.forEach(enrollment => {
      allMilestones.push({
        id: `enrollment-${enrollment.id}`,
        type: 'enrollment',
        title: `Started "${enrollment.track.title}"`,
        description: `Enrolled in ${enrollment.track.title} learning track`,
        date: enrollment.startedAt,
        icon: <BookOpen className="h-4 w-4" />,
        color: 'bg-blue-500',
        link: `/learn/${enrollment.track.slug}`
      })

      // Add completion milestone if completed
      if (enrollment.progressPct === 100 && enrollment.completedAt) {
        allMilestones.push({
          id: `completion-${enrollment.id}`,
          type: 'completion',
          title: `Completed "${enrollment.track.title}"`,
          description: `Finished all lessons in ${enrollment.track.title}`,
          date: enrollment.completedAt,
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-500',
          badge: 'Completed',
          link: `/learn/${enrollment.track.slug}`
        })
      }
    })

    // Add certificate milestones
    certificates.forEach(certificate => {
      allMilestones.push({
        id: `certificate-${certificate.id}`,
        type: 'certificate',
        title: `Earned Certificate`,
        description: `Received certificate for ${certificate.track.title}`,
        date: certificate.issuedAt,
        icon: <Award className="h-4 w-4" />,
        color: 'bg-yellow-500',
        badge: 'Certificate',
        link: `/learn/cert/${certificate.code}`
      })
    })

    // Add streak milestones
    if (streak >= 7) {
      allMilestones.push({
        id: 'streak-7',
        type: 'streak',
        title: '7-Day Learning Streak',
        description: 'Completed lessons for 7 consecutive days',
        date: new Date(), // Approximate date
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'bg-orange-500',
        badge: 'Streak'
      })
    }

    if (streak >= 30) {
      allMilestones.push({
        id: 'streak-30',
        type: 'streak',
        title: '30-Day Learning Streak',
        description: 'Completed lessons for 30 consecutive days',
        date: new Date(), // Approximate date
        icon: <Trophy className="h-4 w-4" />,
        color: 'bg-red-500',
        badge: 'Legendary'
      })
    }

    // Add achievement milestones based on progress
    const totalLessons = progress.length
    if (totalLessons >= 10) {
      allMilestones.push({
        id: 'achievement-10',
        type: 'achievement',
        title: '10 Lessons Completed',
        description: 'Completed your first 10 lessons',
        date: new Date(), // Approximate date
        icon: <Target className="h-4 w-4" />,
        color: 'bg-purple-500',
        badge: 'Achievement'
      })
    }

    if (totalLessons >= 50) {
      allMilestones.push({
        id: 'achievement-50',
        type: 'achievement',
        title: '50 Lessons Completed',
        description: 'Completed 50 lessons - you\'re on fire!',
        date: new Date(), // Approximate date
        icon: <Star className="h-4 w-4" />,
        color: 'bg-indigo-500',
        badge: 'Master'
      })
    }

    // Sort by date (most recent first)
    return allMilestones.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [enrollments, progress, certificates, streak])

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return <BookOpen className="h-4 w-4" />
      case 'completion': return <CheckCircle className="h-4 w-4" />
      case 'certificate': return <Award className="h-4 w-4" />
      case 'streak': return <TrendingUp className="h-4 w-4" />
      case 'achievement': return <Star className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const getMilestoneColor = (type: string) => {
    switch (type) {
      case 'enrollment': return 'bg-blue-500'
      case 'completion': return 'bg-green-500'
      case 'certificate': return 'bg-yellow-500'
      case 'streak': return 'bg-orange-500'
      case 'achievement': return 'bg-purple-500'
      default: return 'bg-slate-500'
    }
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'Certificate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Streak': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Legendary': return 'bg-red-100 text-red-800 border-red-200'
      case 'Achievement': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Master': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  if (milestones.length === 0) {
    return (
      <Card className={cn('bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200', className)}>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Your Learning Journey</h3>
          <p className="text-slate-600 mb-4">Complete your first lesson to see your progress timeline</p>
          <Button asChild>
            <Link href="/learn">Browse Courses</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Calendar className="h-6 w-6" />
          Learning Timeline
        </CardTitle>
        <p className="text-blue-700 text-sm">
          Your learning journey and achievements
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.slice(0, 8).map((milestone, index) => {
            const isSelected = selectedMilestone === milestone.id
            const isLast = index === milestones.slice(0, 8).length - 1
            
            return (
              <div key={milestone.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-slate-300"></div>
                )}
                
                <div 
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg transition-all duration-300 cursor-pointer group',
                    isSelected ? 'bg-blue-100 shadow-md' : 'hover:bg-blue-50'
                  )}
                  onClick={() => setSelectedMilestone(isSelected ? null : milestone.id)}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110',
                    getMilestoneColor(milestone.type)
                  )}>
                    {getMilestoneIcon(milestone.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-300">
                        {milestone.title}
                      </h3>
                      {milestone.badge && (
                        <Badge 
                          variant="secondary" 
                          className={cn('text-xs', getBadgeColor(milestone.badge))}
                        >
                          {milestone.badge}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-300 mb-2">
                      {milestone.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(milestone.date, 'MMM d, yyyy')}
                      </span>
                      {milestone.link && (
                        <Link 
                          href={milestone.link}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors group-hover:scale-105 transform-gpu"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {milestones.length > 8 && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm" className="group-hover:scale-105 transition-transform duration-300">
              <Calendar className="h-4 w-4 mr-2" />
              View All Milestones ({milestones.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
