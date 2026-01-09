'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Save, 
  Eye, 
  EyeOff,
  Calendar,
  Users,
  Settings,
  Trash2,
  Plus,
  Edit,
  Video,
  Upload
} from 'lucide-react'
import { updateTrack, deleteTrack } from '@/lib/actions/learning'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LessonVideoUpload } from './LessonVideoUpload'
import { PdfAttachmentsField } from './PdfAttachmentsField'
import type { PdfResource } from '@/lib/learning/resources'
import { normalizePdfResources } from '@/lib/learning/resources'

interface TrackEditModalProps {
  trackId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onTrackUpdated?: () => void
  onTrackDeleted?: () => void
}

type TabType = 'basic' | 'videos' | 'structure' | 'settings'

export function TrackEditModal({ 
  trackId, 
  open, 
  onOpenChange,
  onTrackUpdated,
  onTrackDeleted
}: TrackEditModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTrack, setIsLoadingTrack] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    coverImage: null as File | null,
    coverUrl: '', // Existing cover URL
    pdfResources: [] as PdfResource[],
    minTier: 'member' as 'guest' | 'member' | 'editor' | 'admin',
    publishedAt: '',
  })
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [coverUploadProgress, setCoverUploadProgress] = useState(0)
  const [trackData, setTrackData] = useState<any>(null)
  const [shouldRefreshTrack, setShouldRefreshTrack] = useState(false)

  const fetchTrack = useCallback(async () => {
    if (!trackId) return
    
    setIsLoadingTrack(true)
    try {
      const res = await fetch(`/api/admin/learn/tracks/${trackId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch track')
      }
      const track = await res.json()
      setTrackData(track)
      setFormData({
        title: track.title || '',
        slug: track.slug || '',
        summary: track.summary || '',
        coverImage: null,
        coverUrl: track.coverUrl || '',
        pdfResources: normalizePdfResources(track.pdfResources),
        minTier: track.minTier || 'member',
        publishedAt: track.publishedAt ? new Date(track.publishedAt).toISOString().slice(0, 16) : '',
      })
      setCoverImagePreview(track.coverUrl || null)
    } catch (error) {
      console.error('Error fetching track:', error)
      toast.error('Failed to load track')
    } finally {
      setIsLoadingTrack(false)
    }
  }, [trackId])

  useEffect(() => {
    if (open && trackId && !isDeleting) {
      fetchTrack()
    }
  }, [open, trackId, fetchTrack, isDeleting])

  // Handle track refresh after video upload
  useEffect(() => {
    if (shouldRefreshTrack) {
      setShouldRefreshTrack(false)
      fetchTrack()
      toast.success('Video lesson uploaded!')
    }
  }, [shouldRefreshTrack, fetchTrack])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from title if slug is empty
      ...(field === 'title' && !prev.slug && { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Upload cover image if a new one was selected
      let coverUrl = formData.coverUrl
      if (formData.coverImage) {
        setCoverUploadProgress(0)
        const { uploadToBlob } = await import('@/lib/blob-upload')
        const uploadResult = await uploadToBlob({
          file: formData.coverImage,
          folder: 'tracks',
          onProgress: (progress) => {
            setCoverUploadProgress(progress)
          }
        })

        if (!uploadResult.success || !uploadResult.url) {
          toast.error(uploadResult.error || 'Cover image upload failed')
          setIsLoading(false)
          return
        }
        coverUrl = uploadResult.url
      }

      const result = await updateTrack(trackId, {
        title: formData.title,
        slug: formData.slug,
        summary: formData.summary,
        coverUrl: coverUrl || undefined,
        pdfResources: formData.pdfResources,
        minTier: formData.minTier,
        publishedAt: formData.publishedAt || undefined,
      })

      if (result.success) {
        toast.success('Track updated successfully')
        // Refresh track data
        await fetchTrack()
        onTrackUpdated?.()
      }
    } catch (error: any) {
      console.error('Error updating track:', error)
      toast.error(error.message || 'Failed to update track')
    } finally {
      setIsLoading(false)
      setCoverUploadProgress(0)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    // Close modal immediately to prevent any fetch attempts
    onOpenChange(false)
    
    try {
      const result = await deleteTrack(trackId)
      if (result.success) {
        toast.success('Track deleted successfully')
        // Navigate away immediately
        router.push('/learning')
        // Defer callback to avoid state updates during render
        setTimeout(() => {
          onTrackDeleted?.()
        }, 200)
      }
    } catch (error: any) {
      console.error('Error deleting track:', error)
      toast.error(error.message || 'Failed to delete track')
      setIsDeleting(false)
      // Re-open modal if deletion failed
      onOpenChange(true)
    }
  }

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'basic', label: 'Basic Info', icon: BookOpen },
    { id: 'videos', label: 'Video Lessons', icon: Video },
    { id: 'structure', label: 'Structure', icon: Settings },
    { id: 'settings', label: 'Settings', icon: Users },
  ]

  if (isLoadingTrack) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Track: {formData.title || 'Loading...'}</DialogTitle>
          <DialogDescription>
            Update track information and settings
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Track Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Foundations of Cryptocurrency Trading"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL Slug *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="e.g., crypto-trading-foundations"
                  required
                />
                <p className="text-sm text-slate-500 mt-1">
                  This will be the URL: /learn/{formData.slug || 'track-slug'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="Brief description of what students will learn..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cover Image
                </label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="cover-image-edit"
                    className={`flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      formData.coverImage
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-300 hover:border-yellow-500 hover:bg-yellow-50'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-5 h-5 text-slate-600" />
                      <span className="text-sm text-slate-600">
                        {formData.coverImage ? formData.coverImage.name : 'Select new cover image'}
                      </span>
                    </div>
                    <input
                      type="file"
                      id="cover-image-edit"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // Validate file type
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select an image file')
                            return
                          }
                          // Validate file size (10MB limit)
                          const maxFileSize = 10 * 1024 * 1024 // 10MB
                          if (file.size > maxFileSize) {
                            toast.error(`Image too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
                            return
                          }
                          setFormData({ ...formData, coverImage: file })
                          setCoverImagePreview(URL.createObjectURL(file))
                        }
                      }}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                  {coverImagePreview && (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-slate-300">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                {coverUploadProgress > 0 && coverUploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${coverUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Uploading cover image... {coverUploadProgress}%</p>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Upload a cover image from your computer (JPG, PNG, WebP up to 10MB). Leave empty to keep existing image.
                </p>
              </div>

              <PdfAttachmentsField
                label="Track PDFs"
                helperText="Upload PDFs to share with students on the track page."
                value={formData.pdfResources}
                onChange={(next) => setFormData(prev => ({ ...prev, pdfResources: next }))}
                folder="learning/track-pdfs"
              />
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && trackId && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Upload Video Lessons</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Upload video files to create lessons in this track. Each video will become a lesson that students can watch.
                </p>
                <LessonVideoUpload 
                  trackId={trackId} 
                  onUploadSuccess={() => {
                    // Set flag to trigger refresh in useEffect (avoids state updates during render)
                    setShouldRefreshTrack(true)
                  }}
                />
              </div>

              {/* Existing Lessons */}
              {trackData && trackData.lessons && trackData.lessons.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Existing Lessons</h3>
                  <div className="space-y-2">
                    {trackData.lessons
                      .filter((lesson: any) => !lesson.sectionId) // Only show lessons without sections
                      .map((lesson: any) => (
                        <Card key={lesson.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Video className="h-5 w-5 text-yellow-600" />
                                <div>
                                  <p className="font-medium">{lesson.title}</p>
                                  {lesson.videoUrl && (
                                    <p className="text-xs text-slate-500">Video: {lesson.videoUrl}</p>
                                  )}
                                </div>
                              </div>
                              <Link href={`/admin/learn/tracks/${trackId}/lessons/${lesson.id}/edit`} target="_blank">
                                <Button type="button" variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Structure Tab */}
          {activeTab === 'structure' && trackData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sections & Lessons</h3>
                <div className="flex gap-2">
                  <Link href={`/admin/learn/tracks/${trackId}/sections/new`} target="_blank">
                    <Button type="button" size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </Link>
                  <Link href={`/admin/learn/tracks/${trackId}/lessons/new`} target="_blank">
                    <Button type="button" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </Button>
                  </Link>
                </div>
              </div>

              {trackData.sections && trackData.sections.length > 0 ? (
                <div className="space-y-4">
                  {trackData.sections.map((section: any) => (
                    <Card key={section.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{section.title}</CardTitle>
                            {section.summary && (
                              <CardDescription>{section.summary}</CardDescription>
                            )}
                          </div>
                          <Link href={`/admin/learn/tracks/${trackId}/sections/${section.id}/edit`} target="_blank">
                            <Button type="button" variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {section.lessons && section.lessons.length > 0 ? (
                          <div className="space-y-2">
                            {section.lessons.map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center justify-between text-sm">
                                <span>{lesson.title}</span>
                                <Link href={`/admin/learn/tracks/${trackId}/lessons/${lesson.id}/edit`} target="_blank">
                                  <Button type="button" variant="ghost" size="sm">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No lessons in this section</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  No sections yet. Click &quot;Add Section&quot; to create one.
                </p>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Tier Required
                </label>
                <select
                  value={formData.minTier}
                  onChange={(e) => handleInputChange('minTier', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="guest">Guest</option>
                  <option value="member">Member</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-sm text-slate-500 mt-1">
                  Users must have at least this tier to access the track
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Publish Date
                </label>
                <Input
                  value={formData.publishedAt}
                  onChange={(e) => handleInputChange('publishedAt', e.target.value)}
                  type="datetime-local"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Leave empty to save as draft. Set a future date to schedule publishing.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
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
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Track'}
            </Button>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    publishedAt: new Date().toISOString().slice(0, 16)
                  }))
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Publish Now
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

