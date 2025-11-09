'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from './FileUpload'
import { X, Plus, Save, Eye } from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'

interface ContentFormProps {
  initialData?: {
    id?: string
    title?: string
    slug?: string
    kind?: string
    excerpt?: string
    body?: string
    coverUrl?: string
    locked?: boolean
    minTier?: string
    tags?: string[]
  }
}

export function ContentForm({ initialData }: ContentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState('')
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    kind: initialData?.kind || 'research',
    excerpt: initialData?.excerpt || '',
    body: initialData?.body || '',
    coverUrl: initialData?.coverUrl || '',
    locked: initialData?.locked || false,
    minTier: initialData?.minTier || '',
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

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/content', {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags,
          id: initialData?.id,
        }),
      })

      if (response.ok) {
        router.push('/admin/content')
      } else {
        console.error('Failed to save content')
      }
    } catch (error) {
      console.error('Error saving content:', error)
    } finally {
      setIsSubmitting(false)
    }
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
            placeholder="Enter content title"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="kind">Content Type *</Label>
          <select 
            value={formData.kind} 
            onChange={(e) => setFormData(prev => ({ ...prev, kind: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="research">Research</option>
            <option value="signal">Trading Signal</option>
            <option value="resource">Resource</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minTier">Minimum Tier</Label>
          <select 
            value={formData.minTier} 
            onChange={(e) => setFormData(prev => ({ ...prev, minTier: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No requirement</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
          </select>
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
          placeholder="Brief description of the content"
          rows={3}
        />
      </div>

      {/* Cover Image */}
      <FileUpload
        value={formData.coverUrl}
        onChange={(url) => setFormData(prev => ({ ...prev, coverUrl: url }))}
        label="Cover Image"
      />

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag} variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publishing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="locked">Lock Content</Label>
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

      {/* Content Body */}
      <div className="space-y-2">
        <Label htmlFor="body">Content Body (HTML/Markdown)</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
          placeholder="Write your content here..."
          rows={12}
          className="font-mono"
        />
      </div>

      {/* Preview */}
      {formData.body && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.body || '') }}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" className="btn-gold" disabled={isSubmitting}>
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Content'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
