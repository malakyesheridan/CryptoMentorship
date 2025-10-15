'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, CheckCircle, AlertCircle, Play } from 'lucide-react'

export default function EpisodeUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    body: '',
    visibility: 'member',
    coverUrl: '',
    videoUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Starting episode upload...')
    console.log('📋 Form data:', formData)

    if (!formData.title) {
      console.log('❌ Missing required fields')
      setErrorMessage('Please enter an episode title')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')

    try {
      console.log('🌐 Sending request to /api/admin/episodes...')
      const response = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          excerpt: formData.excerpt,
          body: formData.body,
          visibility: formData.visibility,
          coverUrl: formData.coverUrl,
          videoUrl: formData.videoUrl,
        }),
      })

      console.log('📡 Response received:', response.status, response.statusText)
      const result = await response.json()
      console.log('📄 Response data:', result)

      if (response.ok && result.ok) {
        console.log('✅ Episode upload successful!')
        setUploadStatus('success')
        setFormData({
          title: '',
          excerpt: '',
          body: '',
          visibility: 'member',
          coverUrl: '',
          videoUrl: '',
        })
        // Refresh the page to show the new episode
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
          <Play className="w-5 h-5" />
          <span>Create New Macro Episode</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Episode Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Market Outlook: Q4 2024 Analysis"
              required
              disabled={isUploading}
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Episode Summary</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Brief summary of the episode content..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Body Content */}
          <div className="space-y-2">
            <Label htmlFor="body">Episode Content</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Detailed episode content, analysis, and insights..."
              rows={6}
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
              placeholder="https://example.com/episode-cover.jpg"
              disabled={isUploading}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL (Optional)</Label>
            <Input
              id="videoUrl"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://example.com/episode-video.mp4"
              disabled={isUploading}
            />
            <p className="text-xs text-slate-500">
              Direct link to the episode video file
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
              <span>Episode created successfully!</span>
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
            disabled={isUploading || !formData.title}
          >
            {isUploading ? 'Creating Episode...' : 'Create Macro Episode'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
