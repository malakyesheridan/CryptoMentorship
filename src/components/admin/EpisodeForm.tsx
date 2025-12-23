'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from './FileUpload'
import { Save, Play, Trash2 } from 'lucide-react'

interface EpisodeFormProps {
  initialData?: {
    id?: string
    title?: string
    slug?: string
    excerpt?: string
    videoUrl?: string
    body?: string
    coverUrl?: string
    locked?: boolean
  }
}

export function EpisodeForm({ initialData }: EpisodeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    videoUrl: initialData?.videoUrl || '',
    body: initialData?.body || '',
    coverUrl: initialData?.coverUrl || '',
    locked: initialData?.locked || false,
  })

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/episodes', {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          id: initialData?.id,
        }),
      })

      if (response.ok) {
        router.push('/admin/episodes')
      } else {
        console.error('Failed to save episode')
      }
    } catch (error) {
      console.error('Error saving episode:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData?.id || isDeleting) return
    const confirmed = window.confirm('Delete this episode permanently? This cannot be undone.')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/admin/episodes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: initialData.id }),
      })

      if (response.ok) {
        router.push('/admin/episodes')
      } else {
        const payload = await response.json().catch(() => ({}))
        console.error('Failed to delete episode', payload)
        window.alert(payload?.error || 'Failed to delete episode')
      }
    } catch (error) {
      console.error('Error deleting episode:', error)
      window.alert('Error deleting episode')
    } finally {
      setIsDeleting(false)
    }
  }

  const isEmbedUrl = (url: string) =>
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com')

  const toEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch')) {
      return url.replace('watch?v=', 'embed/')
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0]
      return id ? `https://www.youtube.com/embed/${id}` : url
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split(/[?&]/)[0]
      return id ? `https://player.vimeo.com/video/${id}` : url
    }
    return url
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter episode title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            placeholder="url-friendly-slug"
            required
          />
        </div>
      </div>

      {/* Video URL */}
      <div className="space-y-2">
        <Label htmlFor="videoUrl">Video URL *</Label>
        <Input
          id="videoUrl"
          value={formData.videoUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
          placeholder="https://www.youtube.com/watch?v=... or embed URL"
          required
        />
        <p className="text-sm text-slate-500">
          Supports YouTube, Vimeo, or direct video URLs
        </p>
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <Label htmlFor="excerpt">Episode Description</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
          placeholder="Brief description of the episode"
          rows={3}
        />
      </div>

      {/* Cover Image */}
      <FileUpload
        value={formData.coverUrl}
        onChange={(url) => setFormData(prev => ({ ...prev, coverUrl: url }))}
        label="Thumbnail Image"
      />

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publishing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="locked">Lock Episode</Label>
              <p className="text-sm text-slate-500">Require membership to view</p>
            </div>
            <input
              type="checkbox"
              id="locked"
              checked={formData.locked}
              onChange={(e) => setFormData(prev => ({ ...prev, locked: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* Episode Notes */}
      <div className="space-y-2">
        <Label htmlFor="body">Episode Notes (Optional)</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
          placeholder="Additional notes, timestamps, or resources..."
          rows={8}
        />
      </div>

      {/* Video Preview */}
      {formData.videoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Video Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              {isEmbedUrl(formData.videoUrl) ? (
                <iframe
                  src={toEmbedUrl(formData.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  title="Episode preview"
                />
              ) : (
                <video
                  src={formData.videoUrl}
                  poster={formData.coverUrl || undefined}
                  className="w-full h-full"
                  controls
                  preload="metadata"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" className="btn-gold" disabled={isSubmitting}>
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Episode'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {initialData?.id ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Episode'}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
