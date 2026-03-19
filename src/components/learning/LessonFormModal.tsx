'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Save, Eye, EyeOff } from 'lucide-react'
import { PdfAttachmentsField } from './PdfAttachmentsField'
import { createLesson, updateLesson } from '@/lib/actions/learning'
import { toast } from 'sonner'
import type { PdfResource } from '@/lib/learning/resources'

interface LessonFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackId: string
  sectionId?: string
  lesson?: {
    id: string
    slug: string
    title: string
    contentMDX?: string | null
    durationMin?: number | null
    videoUrl?: string | null
    pdfResources?: PdfResource[]
    publishedAt?: string | Date | null
    sectionId?: string | null
  }
  sections: { id: string; title: string }[]
  onSuccess: () => void
}

export function LessonFormModal({
  open,
  onOpenChange,
  trackId,
  sectionId: defaultSectionId,
  lesson,
  sections,
  onSuccess,
}: LessonFormModalProps) {
  const isEdit = !!lesson
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    contentMDX: '',
    durationMin: '',
    videoUrl: '',
    pdfResources: [] as PdfResource[],
    publishedAt: '',
    sectionId: '',
  })

  useEffect(() => {
    if (open && lesson) {
      const pubDate = lesson.publishedAt
        ? (lesson.publishedAt instanceof Date
            ? lesson.publishedAt.toISOString().slice(0, 16)
            : new Date(lesson.publishedAt).toISOString().slice(0, 16))
        : ''
      setFormData({
        title: lesson.title,
        slug: lesson.slug,
        contentMDX: lesson.contentMDX || '',
        durationMin: lesson.durationMin?.toString() || '',
        videoUrl: lesson.videoUrl || '',
        pdfResources: lesson.pdfResources || [],
        publishedAt: pubDate,
        sectionId: lesson.sectionId || '',
      })
    } else if (open) {
      setFormData({
        title: '',
        slug: '',
        contentMDX: '',
        durationMin: '',
        videoUrl: '',
        pdfResources: [],
        publishedAt: '',
        sectionId: defaultSectionId || '',
      })
    }
  }, [open, lesson, defaultSectionId])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isEdit && lesson) {
        await updateLesson(lesson.id, {
          title: formData.title,
          slug: formData.slug,
          contentMDX: formData.contentMDX || undefined,
          durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
          videoUrl: formData.videoUrl || undefined,
          pdfResources: formData.pdfResources,
          publishedAt: formData.publishedAt || undefined,
        })
        toast.success('Lesson updated')
      } else {
        await createLesson({
          trackId,
          sectionId: formData.sectionId || undefined,
          title: formData.title,
          slug: formData.slug,
          contentMDX: formData.contentMDX || undefined,
          durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
          videoUrl: formData.videoUrl || undefined,
          pdfResources: formData.pdfResources,
          publishedAt: formData.publishedAt || undefined,
        })
        toast.success('Lesson created')
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} lesson`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update lesson details' : 'Add a new lesson to this track'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">
              Lesson Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lesson-title"
              value={formData.title}
              onChange={(e) => {
                const title = e.target.value
                setFormData(prev => ({
                  ...prev,
                  title,
                  slug: prev.slug || generateSlug(title),
                }))
              }}
              placeholder="e.g., Introduction to Bitcoin"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-slug">
              URL Slug <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lesson-slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="e.g., introduction-to-bitcoin"
              required
              disabled={isLoading}
            />
          </div>

          {!isEdit && sections.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="lesson-section">Section</Label>
              <Select
                id="lesson-section"
                value={formData.sectionId}
                onChange={(e) => setFormData(prev => ({ ...prev, sectionId: e.target.value }))}
                disabled={isLoading}
                className="bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-strong)]"
              >
                <option value="">No section (standalone)</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">Duration (minutes)</Label>
              <Input
                id="lesson-duration"
                type="number"
                value={formData.durationMin}
                onChange={(e) => setFormData(prev => ({ ...prev, durationMin: e.target.value }))}
                placeholder="e.g., 15"
                min="1"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-publish">Publish Date</Label>
              <Input
                id="lesson-publish"
                type="datetime-local"
                value={formData.publishedAt}
                onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-video">Video URL</Label>
            <Input
              id="lesson-video"
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
              placeholder="https://example.com/video.mp4"
              disabled={isLoading}
            />
          </div>

          <PdfAttachmentsField
            label="Lesson PDFs"
            helperText="Upload PDFs to share with students in this lesson."
            value={formData.pdfResources}
            onChange={(next) => setFormData(prev => ({ ...prev, pdfResources: next }))}
            folder="learning/lesson-pdfs"
          />

          <div className="space-y-2">
            <Label htmlFor="lesson-content">Content (MDX)</Label>
            <textarea
              id="lesson-content"
              value={formData.contentMDX}
              onChange={(e) => setFormData(prev => ({ ...prev, contentMDX: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-md bg-transparent text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent font-mono text-sm"
              rows={8}
              placeholder="Write lesson content in Markdown/MDX..."
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-[var(--text-muted)]">
              {formData.publishedAt ? (
                <span className="flex items-center gap-1 text-[#4a7c3f]">
                  <Eye className="h-4 w-4" />
                  Will be published
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#c9a227]">
                  <EyeOff className="h-4 w-4" />
                  Will be saved as draft
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !formData.title.trim() || !formData.slug.trim()}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Lesson' : 'Create Lesson')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
