'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { createLesson } from '@/lib/actions/learning'
import { toast } from 'sonner'

interface NewLessonPageProps {
  params: {
    trackId: string
  }
}

export default function NewLessonPage({ params }: NewLessonPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sectionId = searchParams.get('sectionId')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    contentMDX: '# Lesson Content\n\nWrite your lesson content here using Markdown or MDX.',
    durationMin: '',
    videoUrl: '',
    resources: '',
    publishedAt: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await createLesson({
        trackId: params.trackId,
        sectionId: sectionId || undefined,
        slug: formData.slug,
        title: formData.title,
        contentMDX: formData.contentMDX,
        durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
        videoUrl: formData.videoUrl || undefined,
        resources: formData.resources || undefined,
        publishedAt: formData.publishedAt || undefined,
      })

      if (result.success) {
        toast.success('Lesson created successfully')
        router.push(`/admin/learn/tracks/${params.trackId}`)
      }
    } catch (error: any) {
      console.error('Error creating lesson:', error)
      toast.error(error.message || 'Failed to create lesson')
    } finally {
      setIsLoading(false)
    }
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
              <h1 className="text-3xl font-bold text-slate-900">Create New Lesson</h1>
              <p className="text-slate-600 mt-2">
                Add a new lesson to this track
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Information</CardTitle>
                  <CardDescription>
                    Provide basic details for the lesson
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Lesson Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          title: e.target.value,
                          slug: prev.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                        }))
                      }}
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
                    <p className="text-sm text-slate-500 mt-1">
                      This will be the URL: /learn/{params.trackId}/{formData.slug || 'lesson-slug'}
                    </p>
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

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Resources (JSON array)
                    </label>
                    <textarea
                      value={formData.resources}
                      onChange={(e) => setFormData(prev => ({ ...prev, resources: e.target.value }))}
                      placeholder='[{"title": "Resource 1", "url": "https://example.com/resource1"}]'
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent font-mono text-sm"
                      rows={3}
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      JSON array of resource objects with title and url
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lesson Content (MDX)</CardTitle>
                  <CardDescription>
                    Write your lesson content using Markdown or MDX
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
                    <p className="text-sm text-slate-500 mt-1">
                      Supports Markdown and MDX components
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
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
                
                <div className="flex items-center gap-4">
                  <Link href={`/admin/learn/tracks/${params.trackId}`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Creating...' : 'Create Lesson'}
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

