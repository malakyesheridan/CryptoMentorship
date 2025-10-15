'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react'

export default function ResearchUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    body: '',
    visibility: 'member',
    tags: '',
    coverUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Starting research upload...')
    console.log('📋 Form data:', formData)

    if (!formData.title || !formData.body) {
      console.log('❌ Missing required fields')
      setErrorMessage('Please enter a title and research content')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')

    try {
      console.log('🌐 Sending request to /api/admin/content...')
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          excerpt: formData.excerpt,
          body: formData.body,
          visibility: formData.visibility,
          tags: formData.tags,
          coverUrl: formData.coverUrl,
          kind: 'research',
        }),
      })

      console.log('📡 Response received:', response.status, response.statusText)
      const result = await response.json()
      console.log('📄 Response data:', result)

      if (response.ok && result.ok) {
        console.log('✅ Research upload successful!')
        setUploadStatus('success')
        setFormData({
          title: '',
          excerpt: '',
          body: '',
          visibility: 'member',
          tags: '',
          coverUrl: '',
        })
        // Refresh the page to show the new research
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        console.log('❌ Upload failed:', result.message)
        setUploadStatus('error')
        setErrorMessage(result.message || `Upload failed (${response.status})`)
        return
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Create New Research Article</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Research Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Bitcoin Market Analysis: Q4 2024 Outlook"
              required
              disabled={isUploading}
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Summary/Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Brief summary of the research findings..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Body Content */}
          <div className="space-y-2">
            <Label htmlFor="body">Research Content *</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Detailed research analysis, findings, and insights..."
              rows={8}
              required
              disabled={isUploading}
            />
            <p className="text-xs text-slate-500">
              Supports Markdown formatting for rich content
            </p>
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="coverUrl">Cover Image URL (Optional)</Label>
            <Input
              id="coverUrl"
              value={formData.coverUrl}
              onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              disabled={isUploading}
            />
          </div>

          {/* Tags/Categories */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags/Categories</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., Bitcoin, Market Analysis, DeFi (comma-separated)"
              disabled={isUploading}
            />
            <p className="text-xs text-slate-500">
              Separate multiple tags with commas. These will be used for filtering and categorization.
            </p>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="public">Public - Everyone can view</option>
              <option value="member">Member - Members only</option>
              <option value="admin">Admin - Admins only</option>
            </select>
          </div>

          {/* Status Messages */}
          {uploadStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Research article created successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            disabled={isUploading || !formData.title || !formData.body}
          >
            {isUploading ? 'Creating Research Article...' : 'Create Research Article'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
