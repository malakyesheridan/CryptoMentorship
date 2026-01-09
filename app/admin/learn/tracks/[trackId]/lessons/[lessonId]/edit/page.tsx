'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { updateLesson, deleteLesson } from '@/lib/actions/learning'
import { toast } from 'sonner'
import { PdfAttachmentsField } from '@/components/learning/PdfAttachmentsField'
import type { PdfResource } from '@/lib/learning/resources'
import { normalizePdfResources } from '@/lib/learning/resources'

interface EditLessonPageProps {
  params: {
    trackId: string
    lessonId: string
  }
}

export default function EditLessonPage({ params }: EditLessonPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    contentMDX: '',
    durationMin: '',
    videoUrl: '',
    pdfResources: [] as PdfResource[],
    publishedAt: '',
  })

  useEffect(() => {
    async function fetchLesson() {
      try {
        const res = await fetch(`/api/admin/learn/lessons/${params.lessonId}`)
        if (!res.ok) {
          throw new Error('Failed to fetch lesson')
        }
        const lesson = await res.json()
        
        setFormData({
          slug: lesson.slug || '',
          title: lesson.title || '',
          contentMDX: lesson.contentMDX || '',
          durationMin: lesson.durationMin?.toString() || '',
          videoUrl: lesson.videoUrl || '',
          pdfResources: normalizePdfResources(lesson.pdfResources),
          publishedAt: lesson.publishedAt ? new Date(lesson.publishedAt).toISOString().slice(0, 16) : '',
        })
      } catch (error) {
        console.error('Error fetching lesson:', error)
        toast.error('Failed to load lesson')
      } finally {
        setIsLoadingLesson(false)
      }
    }

    fetchLesson()
  }, [params.lessonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateLesson(params.lessonId, {
        slug: formData.slug,
        title: formData.title,
        contentMDX: formData.contentMDX,
        durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
        videoUrl: formData.videoUrl || undefined,
        pdfResources: formData.pdfResources,
        publishedAt: formData.publishedAt || undefined,
      })

      if (result.success) {
        toast.success('Lesson updated successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error updating lesson:', error)
      toast.error(error.message || 'Failed to update lesson')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const result = await deleteLesson(params.lessonId)
      if (result.success) {
        toast.success('Lesson deleted successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error deleting lesson:', error)
      toast.error(error.message || 'Failed to delete lesson')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingLesson) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                <div className="h-64 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Link href={`/admin/learn/tracks/${params.trackId}`}>
                <Button variant="outline" size="sm" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Track
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Edit Lesson</h1>
              <p className="text-slate-600 mt-2">
                Update lesson content and settings
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Information</CardTitle>
                  <CardDescription>
                    Update basic lesson details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Lesson Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Introduction to Bitcoin"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      URL Slug *
                    </label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g., introduction-to-bitcoin"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Duration (minutes)
                      </label>
                      <Input
                        type="number"
                        value={formData.durationMin}
                        onChange={(e) => setFormData(prev => ({ ...prev, durationMin: e.target.value }))}
                        placeholder="e.g., 15"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Publish Date
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.publishedAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Video URL
                    </label>
                    <Input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>

                  <PdfAttachmentsField
                    label="Lesson PDFs"
                    helperText="Upload PDFs to share with students in this lesson."
                    value={formData.pdfResources}
                    onChange={(next) => setFormData(prev => ({ ...prev, pdfResources: next }))}
                    folder="learning/lesson-pdfs"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lesson Content (MDX)</CardTitle>
                  <CardDescription>
                    Update lesson content using Markdown or MDX
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={formData.contentMDX}
                      onChange={(e) => setFormData(prev => ({ ...prev, contentMDX: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent font-mono text-sm"
                      rows={20}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Lesson
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-500">
                    {formData.publishedAt ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Eye className="h-4 w-4" />
                        Will be published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <EyeOff className="h-4 w-4" />
                        Will be saved as draft
                      </span>
                    )}
                  </div>
                  <Link href={`/admin/learn/tracks/${params.trackId}`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

