'use client'

import { useState } from 'react'
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
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { QuizComponent } from '@/components/learning/QuizComponent'
import { formatRelativeTime } from '@/lib/cohorts'
import { completeLesson, submitQuiz, enrollInTrack } from '@/lib/actions/learning'
import { RealTimeProgress } from '@/components/learning/RealTimeProgress'
import { useSession } from 'next-auth/react'
import VideoPlayer from '@/components/VideoPlayer'
import { LessonMDXRenderer } from '@/components/learning/LessonMDXRenderer'
import { toast } from 'sonner'

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
    durationMin?: number
    videoUrl?: string
    contentMDX?: string
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
  const [isCompleting, setIsCompleting] = useState(false)
  
  const isCompleted = !!progress?.completedAt
  const hasQuiz = !!lesson.quiz
  const quizPassed = quizSubmission?.passed || false
  const isLocked = accessInfo?.isLocked || false
  const canAccess = accessInfo?.canAccess !== false

  // Find lesson navigation - collect all lessons from sections and main lessons array
  const allLessons: Array<{ id: string; slug: string; title: string }> = []
  
  // Add lessons from sections first (they're already ordered)
  track.sections.forEach(section => {
    section.lessons.forEach(lesson => {
      allLessons.push(lesson)
    })
  })
  
  // Add lessons not in any section
  const lessonIdsInSections = new Set(
    track.sections.flatMap(section => section.lessons.map(l => l.id))
  )
  track.lessons.forEach(lesson => {
    if (!lessonIdsInSections.has(lesson.id)) {
      allLessons.push(lesson)
    }
  })
  
  const currentIndex = allLessons.findIndex(l => l.id === lesson.id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
  const isLastLesson = currentIndex === allLessons.length - 1

  // Check if lesson can be completed
  const canComplete = !isCompleted && (!hasQuiz || quizPassed) && canAccess

  // Handle lesson completion
  const handleComplete = async () => {
    if (isCompleting) return
    
    setIsCompleting(true)
    try {
      const result = await completeLesson({ 
        lessonId: lesson.id
      })
      
      if (result?.ok) {
        toast.success('Lesson completed!')
        
        // If it's the last lesson, show congratulations and redirect to track page
        if (isLastLesson) {
          setTimeout(() => {
            toast.success(`🎉 Congratulations! You've completed "${track.title}"!`, {
              duration: 5000,
            })
            router.push(`/learn/${track.slug}`)
          }, 500)
        } else if (nextLesson) {
          // Navigate to next lesson
          setTimeout(() => {
            router.push(`/learn/${track.slug}/lesson/${nextLesson.slug}`)
          }, 500)
        }
      } else {
        toast.error('Failed to complete lesson. Please try again.')
      }
    } catch (error) {
      console.error('Error completing lesson:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to complete lesson')
    } finally {
      setIsCompleting(false)
    }
  }


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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Lessons</h4>
                    <div className="space-y-1">
                      {track.sections.map((section) => (
                        <div key={section.id} className="space-y-1">
                          {section.title && (
                            <h5 className="text-xs font-medium text-slate-600 uppercase tracking-wide px-2 py-1">
                              {section.title}
                            </h5>
                          )}
                          {section.lessons.map((sectionLesson) => {
                            const isCurrentLesson = sectionLesson.id === lesson.id
                            const isCompleted = userProgress[sectionLesson.id] || false
                            
                            return (
                              <Link
                                key={sectionLesson.id}
                                href={`/learn/${track.slug}/lesson/${sectionLesson.slug}`}
                                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                                  isCurrentLesson
                                    ? 'bg-gold-100 text-gold-900 font-medium border border-gold-200'
                                    : isCompleted
                                    ? 'text-green-700 hover:bg-green-50'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCompleted ? (
                                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                  ) : (
                                    <Play className="h-4 w-4 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{sectionLesson.title}</span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
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

                {/* Description */}
                {lesson.contentMDX && lesson.contentMDX.trim() && (
                  <div className="mb-6">
                    <div className="prose prose-slate max-w-none">
                      <LessonMDXRenderer content={lesson.contentMDX} />
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

                {/* Completion Button */}
                {canComplete && (
                  <div className="mb-8">
                    <Button 
                      onClick={handleComplete}
                      disabled={isCompleting}
                      size="lg" 
                      className="w-full"
                    >
                      {isCompleting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Mark Complete
                        </>
                      )}
                    </Button>
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
