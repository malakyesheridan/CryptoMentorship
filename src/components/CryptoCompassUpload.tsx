'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Play, Shield } from 'lucide-react'

export default function CryptoCompassUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Episode form data
  const [episodeData, setEpisodeData] = useState({
    title: '',
    excerpt: '',
    body: '',
    coverUrl: '',
    videoUrl: '',
    category: 'daily-update' as 'daily-update' | 'analysis' | 'breakdown',
    locked: false,
  })

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setErrorMessage('')
    setUploadStatus('idle')

    // Validate required fields
    if (!episodeData.title || episodeData.title.trim() === '') {
      setErrorMessage('Episode title is required')
      setUploadStatus('error')
      return
    }

    if (!episodeData.videoUrl || episodeData.videoUrl.trim() === '') {
      setErrorMessage('Video URL is required')
      setUploadStatus('error')
      return
    }

    // Validate URL format
    try {
      new URL(episodeData.videoUrl)
    } catch {
      setErrorMessage('Please enter a valid video URL')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      const slug = generateSlug(episodeData.title)
      
      const response = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: episodeData.title,
          slug,
          excerpt: episodeData.excerpt || undefined,
          body: episodeData.body || undefined,
          videoUrl: episodeData.videoUrl,
          coverUrl: episodeData.coverUrl || undefined,
          category: episodeData.category,
          locked: episodeData.locked,
        }),
      })

      const result = await response.json()

      if (response.ok && result.id) {
        setUploadStatus('success')
        setEpisodeData({
          title: '',
          excerpt: '',
          body: '',
          coverUrl: '',
          videoUrl: '',
          category: 'daily-update',
          locked: false,
        })
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setUploadStatus('error')
        setErrorMessage(result.error || `Upload failed (${response.status})`)
      }
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }


  return (
    <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
      <CardHeader className="border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Play className="w-5 h-5 text-yellow-500" />
              <span>Create New Crypto Compass Episode</span>
            </CardTitle>
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-2 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEpisodeSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="episode-title" className="flex items-center gap-2">
                Episode Title
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="episode-title"
                value={episodeData.title}
                onChange={(e) => {
                  setEpisodeData({ ...episodeData, title: e.target.value })
                  setErrorMessage('')
                }}
                placeholder="e.g., Market Outlook: Q4 2024 Analysis"
                required
                disabled={isUploading}
                className={uploadStatus === 'error' && !episodeData.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              />
              <p className="text-xs text-slate-500">
                Slug will be auto-generated from title
              </p>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="video-url" className="flex items-center gap-2">
                Video URL
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="video-url"
                type="url"
                value={episodeData.videoUrl}
                onChange={(e) => {
                  setEpisodeData({ ...episodeData, videoUrl: e.target.value })
                  setErrorMessage('')
                }}
                placeholder="https://example.com/episode-video.mp4"
                required
                disabled={isUploading}
                className={uploadStatus === 'error' && !episodeData.videoUrl ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              />
              <p className="text-xs text-slate-500">
                Direct link to the episode video file
              </p>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Episode Summary</Label>
              <Textarea
                id="excerpt"
                value={episodeData.excerpt}
                onChange={(e) => setEpisodeData({ ...episodeData, excerpt: e.target.value })}
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
                value={episodeData.body}
                onChange={(e) => setEpisodeData({ ...episodeData, body: e.target.value })}
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
              <Label htmlFor="cover-url">Cover Image URL (Optional)</Label>
              <Input
                id="cover-url"
                type="url"
                value={episodeData.coverUrl}
                onChange={(e) => setEpisodeData({ ...episodeData, coverUrl: e.target.value })}
                placeholder="https://example.com/episode-cover.jpg"
                disabled={isUploading}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={episodeData.category}
                onChange={(e) => setEpisodeData({ ...episodeData, category: e.target.value as 'daily-update' | 'analysis' | 'breakdown' })}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="daily-update">Daily Update</option>
                <option value="analysis">Analysis</option>
                <option value="breakdown">Breakdown</option>
              </select>
              <p className="text-xs text-slate-500">
                Select the category for this episode
              </p>
            </div>

            {/* Locked Toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="locked"
                checked={episodeData.locked}
                onChange={(e) => setEpisodeData({ ...episodeData, locked: e.target.checked })}
                disabled={isUploading}
                className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
              />
              <Label htmlFor="locked" className="cursor-pointer text-sm">
                Lock episode (requires membership tier to view)
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-6 text-base"
              disabled={isUploading || !episodeData.title || !episodeData.videoUrl}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Episode...
                </>
              ) : (
                'Create Crypto Compass Episode'
              )}
            </Button>
          </form>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="mt-4 flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Episode created successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

