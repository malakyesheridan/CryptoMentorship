'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CircularProgress } from './CircularProgress'
import { 
  Play, 
  CheckCircle, 
  Clock, 
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CourseData {
  id: string
  slug: string
  title: string
  summary: string | null
  coverUrl: string | null
  progressPct: number
  startedAt: Date
  completedAt: Date | null
  totalLessons: number
  completedLessons: number
}

interface CourseCarouselProps {
  courses: CourseData[]
  className?: string
}

export function CourseCarousel({ courses, className = '' }: CourseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  if (!courses || courses.length === 0) {
    return (
      <div className={cn('text-center py-12 px-6', className)}>
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <BookOpen className="h-16 w-16 text-slate-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Start Your Learning Journey</h3>
            <p className="text-slate-600 mb-6">Discover structured courses designed to help you master new skills and advance your knowledge.</p>
          </div>
          
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:shadow-lg transition-all duration-300">
              <Link href="/learn">
                <BookOpen className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                Browse Learning Tracks
              </Link>
            </Button>
            
            <div className="text-sm text-slate-500">
              <p>✨ Free courses available</p>
              <p>🎯 Self-paced learning</p>
              <p>📜 Certificates upon completion</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const visibleCourses = courses.slice(0, 3) // Show max 3 courses
  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex < courses.length - 3

  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    }
  }

  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex(prev => Math.min(courses.length - 3, prev + 1))
    }
  }

  const getStatusBadge = (course: CourseData) => {
    if (course.completedAt) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    } else if (course.progressPct > 0) {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-slate-600">
          <BookOpen className="h-3 w-3 mr-1" />
          New
        </Badge>
      )
    }
  }

  const getActionButton = (course: CourseData) => {
    if (course.completedAt) {
      return (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/learn/${course.slug}`}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Review
          </Link>
        </Button>
      )
    } else if (course.progressPct > 0) {
      return (
        <Button size="sm" asChild>
          <Link href={`/learn/${course.slug}`}>
            <Play className="h-4 w-4 mr-2" />
            Continue
          </Link>
        </Button>
      )
    } else {
      return (
        <Button size="sm" asChild>
          <Link href={`/learn/${course.slug}`}>
            <Play className="h-4 w-4 mr-2" />
            Start
          </Link>
        </Button>
      )
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Navigation buttons */}
      {courses.length > 3 && (
        <>
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Course cards */}
      <div className="flex gap-4 overflow-hidden">
        {visibleCourses.map((course, index) => (
          <Card key={course.id} className="min-w-[280px] flex-shrink-0 group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 transform-gpu">
            <CardContent className="p-4">
              {/* Course image */}
              <div className="relative mb-4 group-hover:scale-105 transition-transform duration-300">
                {course.coverUrl ? (
                  <Image
                    src={course.coverUrl}
                    alt={course.title}
                    width={280}
                    height={160}
                    className="w-full h-32 object-cover rounded-lg group-hover:brightness-110 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-300">
                    <BookOpen className="h-12 w-12 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                )}
                
                {/* Progress overlay */}
                {course.progressPct > 0 && (
                  <div className="absolute top-2 right-2 group-hover:scale-110 transition-transform duration-300">
                    <CircularProgress
                      progress={course.progressPct}
                      size={32}
                      strokeWidth={3}
                      color="#16a34a"
                      showPercentage={false}
                      animated={true}
                    />
                  </div>
                )}
              </div>

              {/* Course info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 flex-1 mr-2 group-hover:text-blue-700 transition-colors duration-300">
                    {course.title}
                  </h3>
                  <div className="group-hover:scale-105 transition-transform duration-300">
                    {getStatusBadge(course)}
                  </div>
                </div>

                {course.summary && (
                  <p className="text-xs text-slate-600 line-clamp-2 group-hover:text-slate-700 transition-colors duration-300">
                    {course.summary}
                  </p>
                )}

                {/* Progress info */}
                <div className="flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-300">
                  <span>
                    {course.completedLessons} of {course.totalLessons} lessons
                  </span>
                  {course.progressPct > 0 && (
                    <span className="font-medium">
                      {course.progressPct}% complete
                    </span>
                  )}
                </div>

                {/* Action button */}
                <div className="pt-2 group-hover:scale-105 transition-transform duration-300">
                  {getActionButton(course)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dots indicator */}
      {courses.length > 3 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(courses.length / 3) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index * 3)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                Math.floor(currentIndex / 3) === index
                  ? 'bg-blue-600'
                  : 'bg-slate-300 hover:bg-slate-400'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
