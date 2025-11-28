'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Play, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Video,
  FileText,
  HelpCircle,
  Award,
  Lock,
  Calendar,
  Timer
} from 'lucide-react'
import Link from 'next/link'
import { LessonMDXRenderer } from '@/components/learning/LessonMDXRenderer'
import type { SerializedMDXSource } from '@/lib/mdx'
import { QuizComponent } from '@/components/learning/QuizComponent'
import { validateResources } from '@/lib/schemas/learning'
import { formatRelativeTime } from '@/lib/cohorts'
import { completeLesson, submitQuiz, enrollInTrack } from '@/lib/actions/learning'
import { RealTimeProgress } from '@/components/learning/RealTimeProgress'
import { useSession } from 'next-auth/react'
import VideoPlayer from '@/components/VideoPlayer'

interface LessonPlayerProps {
  track: {
    id: string
    slug: string
    title: string
    sections: Array<{
      id: string
      title: string
      lessons: Array<{
        id: string
        slug: string
        title: string
      }>
    }>
    lessons: Array<{
      id: string
      slug: string
      title: string
    }>
  }
  lesson: {
    id: string
    slug: string
    title: string
    contentMDX: string
    mdx?: SerializedMDXSource | null
    durationMin?: number
    videoUrl?: string
    resources?: string
    quiz?: {
      id: string
      questions: string
      passPct: number
    }
    section?: {
      id: string
      title: string
    }
  }
  progress: {
    completedAt?: Date
  } | null
  quizSubmission: {
    scorePct: number
    passed: boolean
    answers: string
  } | null
  userProgress: Record<string, boolean>
  accessInfo?: {
    canAccess: boolean
    isLocked: boolean
    releaseAt?: Date
    cohortId?: string
  }
}

export function LessonPlayer({ 
  track, 
  lesson, 
  progress, 
  quizSubmission, 
  userProgress,
  accessInfo
}: LessonPlayerProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Time tracking state
  const [timeSpent, setTimeSpent] = useState(0)
  const [isTracking, setIsTracking] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const isCompleted = !!progress?.completedAt
  const hasQuiz = !!lesson.quiz
  const quizPassed = quizSubmission?.passed || false
  const isLocked = accessInfo?.isLocked || false
  const canAccess = accessInfo?.canAccess !== false

  // Find lesson navigation
  const allLessons = track.lessons
  const currentIndex = allLessons.findIndex(l => l.id === lesson.id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  // Check if lesson can be completed
  const canComplete = !isCompleted && (!hasQuiz || quizPassed) && canAccess

  // Time tracking functions
  const startTimeTracking = () => {
    if (!isTracking && canAccess) {
      setIsTracking(true)
      startTimeRef.current = Date.now()
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setTimeSpent(Date.now() - startTimeRef.current)
        }
      }, 1000)
    }
  }

  const stopTimeTracking = () => {
    if (isTracking) {
      setIsTracking(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (startTimeRef.current) {
        setTimeSpent(Date.now() - startTimeRef.current)
        startTimeRef.current = null
      }
    }
  }

  // Start tracking when component mounts and lesson is accessible
  useEffect(() => {
    if (canAccess && !isCompleted) {
      startTimeTracking()
    }
    
    return () => {
      stopTimeTracking()
    }
  }, [canAccess, isCompleted])

  // Format time display
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'n':
          if (nextLesson && canAccess) {
            router.push(`/learn/${track.slug}/lesson/${nextLesson.slug}`)
          }
          break
        case 'p':
          if (prevLesson && canAccess) {
            router.push(`/learn/${track.slug}/lesson/${prevLesson.slug}`)
          }
          break
        case 'm':
          if (canComplete) {
            // Trigger completion
            const form = document.querySelector('form[action*="complete-lesson"]') as HTMLFormElement
            if (form) {
              form.requestSubmit()
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nextLesson, prevLesson, canComplete, canAccess, router, track.slug])

  // Show locked lesson view
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-4">
                    <Link href={`/learn/${track.slug}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Track
                      </Button>
                    </Link>
                  </div>
                  <CardTitle className="text-lg">{track.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {track.sections.map((section) => (
                      <div key={section.id} className="space-y-1">
                        <h4 className="font-medium text-slate-900 text-sm">{section.title}</h4>
                        <div className="space-y-1 ml-2">
                          {section.lessons.map((sectionLesson) => {
                            const isCurrentLesson = sectionLesson.id === lesson.id
                            const isCompleted = userProgress[sectionLesson.id] || false
                            
                            return (
                              <Link
                                key={sectionLesson.id}
                                href={`/learn/${track.slug}/lesson/${sectionLesson.slug}`}
                                className={`block p-2 rounded text-sm ${
                                  isCurrentLesson
                                    ? 'bg-gold-100 text-gold-700 font-medium'
                                    : isCompleted
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCompleted ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  <span className="truncate">{sectionLesson.title}</span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Locked */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                        <Lock className="h-6 w-6 text-yellow-600" />
                        {lesson.title}
                      </CardTitle>
                      {lesson.section && (
                        <CardDescription className="text-sm text-slate-600 mb-2">
                          {lesson.section.title}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {lesson.durationMin && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {lesson.durationMin} minutes
                          </span>
                        )}
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Lock className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">
                      This lesson is not yet available
                    </h3>
                    <p className="text-slate-600 mb-6">
                      This lesson will be released as part of your cohort schedule.
                    </p>
                    {accessInfo?.releaseAt && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-yellow-800">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {formatRelativeTime(accessInfo.releaseAt)}
                          </span>
                        </div>
                      </div>
                    )}
                    <Link href={`/learn/${track.slug}`}>
                      <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Track
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Real-Time Progress */}
            {session?.user?.id && (
              <RealTimeProgress 
                userId={session.user.id}
                trackId={track.id}
                showAchievements={true}
                showStreak={true}
              />
            )}
            
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center gap-2 mb-4">
                  <Link href={`/learn/${track.slug}`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Track
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-lg">{track.title}</CardTitle>
                
                {/* Keyboard Shortcuts Help */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Keyboard Shortcuts</h4>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Next lesson:</span>
                      <kbd className="px-1 py-0.5 bg-white border rounded text-xs">N</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Previous lesson:</span>
                      <kbd className="px-1 py-0.5 bg-white border rounded text-xs">P</kbd>
                    </div>
                    {canComplete && (
                      <div className="flex justify-between">
                        <span>Mark complete:</span>
                        <kbd className="px-1 py-0.5 bg-white border rounded text-xs">M</kbd>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {track.sections.map((section) => (
                    <div key={section.id} className="space-y-1">
                      <h4 className="font-medium text-slate-900 text-sm">{section.title}</h4>
                      <div className="space-y-1 ml-2">
                        {section.lessons.map((sectionLesson) => {
                          const isCurrentLesson = sectionLesson.id === lesson.id
                          const isCompleted = userProgress[sectionLesson.id] || false
                          
                          return (
                            <Link
                              key={sectionLesson.id}
                              href={`/learn/${track.slug}/lesson/${sectionLesson.slug}`}
                              className={`block p-2 rounded text-sm ${
                                isCurrentLesson
                                  ? 'bg-gold-100 text-gold-700 font-medium'
                                  : isCompleted
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCompleted ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                                <span className="truncate">{sectionLesson.title}</span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{lesson.title}</CardTitle>
                    {lesson.section && (
                      <CardDescription className="text-sm text-slate-600 mb-2">
                        {lesson.section.title}
                      </CardDescription>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {lesson.durationMin && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {lesson.durationMin} minutes
                        </span>
                      )}
                      {hasQuiz && (
                        <Badge variant="secondary" className="text-xs">
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Quiz Required
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Video */}
                {lesson.videoUrl && (
                  <div className="mb-6">
                    <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                      {lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be') ? (
                        <iframe
                          src={lesson.videoUrl.replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <VideoPlayer
                          src={lesson.videoUrl}
                          title={lesson.title}
                          className="w-full h-full"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="mb-8">
                  <LessonMDXRenderer serialized={lesson.mdx} content={lesson.contentMDX} />
                </div>

                {/* Resources */}
                {lesson.resources && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gold-600" />
                      Resources
                    </h3>
                    <div className="space-y-2">
                      {validateResources(lesson.resources).map((resource, index) => (
                        <a
                          key={index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-gold-50 border border-gold-200 rounded-lg hover:bg-gold-100 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-gold-600" />
                          <span className="text-gold-800 font-medium">{resource.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quiz Section */}
                {hasQuiz && lesson.quiz && (
                  <QuizComponent
                    lessonId={lesson.id}
                    questions={JSON.parse(lesson.quiz.questions)}
                    passPct={lesson.quiz.passPct}
                    existingSubmission={quizSubmission || undefined}
                  />
                )}

                {/* Time Tracking Display */}
                {canAccess && !isCompleted && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium">Time Spent:</span>
                        <span className="text-sm text-slate-600">{formatTime(timeSpent)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-xs text-slate-500">
                          {isTracking ? 'Tracking' : 'Paused'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completion Button */}
                {canComplete && (
                  <div className="mb-8">
                    <form action={async () => {
                      stopTimeTracking()
                      await completeLesson({ 
                        lessonId: lesson.id,
                        timeSpentMs: timeSpent
                      })
                    }}>
                      <Button type="submit" size="lg" className="w-full">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Mark Complete
                      </Button>
                    </form>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                  <div>
                    {prevLesson ? (
                      <Link href={`/learn/${track.slug}/lesson/${prevLesson.slug}`}>
                        <Button variant="outline" className="flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Previous Lesson
                        </Button>
                      </Link>
                    ) : (
                      <div />
                    )}
                  </div>
                  
                  <div>
                    {nextLesson ? (
                      <Link href={`/learn/${track.slug}/lesson/${nextLesson.slug}`}>
                        <Button className="flex items-center gap-2">
                          Next Lesson
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/learn/${track.slug}`}>
                        <Button className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Complete Track
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
