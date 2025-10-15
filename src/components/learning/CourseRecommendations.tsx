'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { enrollInTrack } from '@/lib/actions/enrollment'
import { toast } from 'sonner'

interface CourseItem {
  id: string
  slug: string
  title: string
  description?: string | null
  coverUrl?: string | null
  publishedAt: Date | null
  isEnrolled: boolean
  progressPct: number
  reason?: string
  priority?: 'high' | 'medium' | 'low'
}

interface CourseRecommendationsProps {
  courses: CourseItem[]
  className?: string
}

export function CourseRecommendations({ courses, className = '' }: CourseRecommendationsProps) {
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null)
  const [recommendedCourses, setRecommendedCourses] = useState<CourseItem[]>([])

  useEffect(() => {
    // Simple recommendation algorithm
    const recommendations = courses
      .filter(course => !course.isEnrolled) // Only unenrolled courses
      .map(course => {
        let reason = ''
        let priority: 'high' | 'medium' | 'low' = 'low'
        
        // Recent courses get higher priority
        if (course.publishedAt) {
          const daysSincePublished = Math.floor(
            (new Date().getTime() - new Date(course.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
          )
          
          if (daysSincePublished <= 7) {
            reason = 'Recently Added'
            priority = 'high'
          } else if (daysSincePublished <= 30) {
            reason = 'New Course'
            priority = 'medium'
          }
        }
        
        // Courses with popular keywords get higher priority
        const popularKeywords = ['beginner', 'introduction', 'fundamentals', 'basics', 'getting started']
        const hasPopularKeyword = popularKeywords.some(keyword => 
          course.title.toLowerCase().includes(keyword) || 
          course.description?.toLowerCase().includes(keyword)
        )
        
        if (hasPopularKeyword && !reason) {
          reason = 'Popular Choice'
          priority = 'medium'
        }
        
        // Default reason
        if (!reason) {
          reason = 'Recommended for You'
          priority = 'low'
        }
        
        return {
          ...course,
          reason,
          priority
        }
      })
      .sort((a, b) => {
        // Sort by priority (high -> medium -> low)
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority || 'low'] - priorityOrder[a.priority || 'low']
      })
      .slice(0, 6) // Show top 6 recommendations
    
    setRecommendedCourses(recommendations)
  }, [courses])

  const handleEnroll = async (trackId: string) => {
    setIsEnrolling(trackId)
    try {
      await enrollInTrack({ trackId })
      toast.success('Successfully enrolled in course!')
      // Update the course status
      setRecommendedCourses(prev => 
        prev.map(course => 
          course.id === trackId 
            ? { ...course, isEnrolled: true, progressPct: 0 }
            : course
        )
      )
    } catch (error) {
      console.error('Failed to enroll:', error)
      toast.error('Failed to enroll in course.')
    } finally {
      setIsEnrolling(null)
    }
  }

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <Star className="h-3 w-3" />
      case 'medium': return <TrendingUp className="h-3 w-3" />
      case 'low': return <BookOpen className="h-3 w-3" />
      default: return <BookOpen className="h-3 w-3" />
    }
  }

  if (recommendedCourses.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
        <p className="text-slate-600 mb-4">You&apos;re enrolled in all available courses. Great job!</p>
        <Button asChild>
          <Link href="/learn">Browse All Courses</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendedCourses.map(course => (
          <Card key={course.id} className="group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 transform-gpu">
            <CardHeader className="p-0">
              {course.coverUrl && (
                <div className="aspect-video relative rounded-t-lg overflow-hidden">
                  <Image
                    src={course.coverUrl}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {/* Priority badge */}
                  <div className="absolute top-2 left-2">
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs', getPriorityColor(course.priority || 'low'))}
                    >
                      {getPriorityIcon(course.priority || 'low')}
                      <span className="ml-1">{course.priority?.toUpperCase()}</span>
                    </Badge>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-700 transition-colors duration-300">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 group-hover:text-slate-600 transition-colors duration-300">
                    {course.reason}
                  </p>
                </div>

                {course.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 group-hover:text-slate-700 transition-colors duration-300">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-300">
                  <span>New Course</span>
                  {course.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor((new Date().getTime() - new Date(course.publishedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" className="flex-1 group-hover:scale-105 transition-transform duration-300">
                    <Link href={`/learn/${course.slug}`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  
                  <Button 
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white group-hover:scale-105 transition-all duration-300"
                    onClick={() => handleEnroll(course.id)}
                    disabled={isEnrolling === course.id}
                  >
                    {isEnrolling === course.id ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        Enroll Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <Button asChild variant="outline" className="group-hover:scale-105 transition-transform duration-300">
          <Link href="/learn">
            View All Courses
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
