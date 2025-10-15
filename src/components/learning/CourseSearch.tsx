'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  BookOpen, 
  Play, 
  Clock,
  Users,
  Star,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CourseData {
  id: string
  slug: string
  title: string
  description: string | null
  coverUrl: string | null
  publishedAt: Date | null
  isEnrolled?: boolean
  progressPct?: number
}

interface CourseSearchProps {
  courses: CourseData[]
  onEnroll?: (courseId: string) => Promise<void>
  className?: string
}

export function CourseSearch({ courses, onEnroll, className = '' }: CourseSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return courses.slice(0, 6) // Show first 6 courses when no search
    }

    const query = debouncedQuery.toLowerCase()
    return courses.filter(course => 
      course.title.toLowerCase().includes(query) ||
      course.description?.toLowerCase().includes(query)
    ).slice(0, 8) // Show up to 8 results
  }, [courses, debouncedQuery])

  const handleEnroll = async (courseId: string) => {
    if (onEnroll) {
      setIsSearching(true)
      try {
        await onEnroll(courseId)
      } catch (error) {
        console.error('Failed to enroll:', error)
      } finally {
        setIsSearching(false)
      }
    }
  }

  const getCourseStatus = (course: CourseData) => {
    if (course.isEnrolled) {
      if (course.progressPct === 100) {
        return { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' }
      } else if (course.progressPct && course.progressPct > 0) {
        return { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200' }
      } else {
        return { label: 'Enrolled', color: 'bg-slate-100 text-slate-800 border-slate-200' }
      }
    }
    return null
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search courses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {debouncedQuery && (
            <p className="text-sm text-slate-600 mt-2">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Course Results */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const status = getCourseStatus(course)
            
            return (
              <Card key={course.id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  {/* Course image */}
                  <div className="relative">
                    {course.coverUrl ? (
                      <Image
                        src={course.coverUrl}
                        alt={course.title}
                        width={400}
                        height={200}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-t-lg flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-blue-600" />
                      </div>
                    )}
                    
                    {/* Status badge */}
                    {status && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Course info */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-slate-900 line-clamp-2">
                      {course.title}
                    </h3>
                    
                    {course.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Course metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Self-paced</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Online</span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-2">
                      {course.isEnrolled ? (
                        <Button asChild className="w-full">
                          <Link href={`/learn/${course.slug}`}>
                            {course.progressPct === 100 ? (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Review Course
                              </>
                            ) : course.progressPct && course.progressPct > 0 ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Continue Learning
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Start Learning
                              </>
                            )}
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => handleEnroll(course.id)}
                          disabled={isSearching}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Enroll Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {debouncedQuery ? 'No courses found' : 'No courses available'}
            </h3>
            <p className="text-slate-600 mb-4">
              {debouncedQuery 
                ? `No courses match "${debouncedQuery}". Try a different search term.`
                : 'There are no courses available at the moment.'
              }
            </p>
            {debouncedQuery && (
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* View All Courses */}
      {!debouncedQuery && (
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/learn">
              View All Courses
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
