'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Upload, BookOpen, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { createTrack } from '@/lib/actions/learning'
import { useRouter } from 'next/navigation'

export function SimpleTrackUpload() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    coverUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setErrorMessage('')
    setUploadStatus('idle')

    // Validate required fields
    if (!formData.title || formData.title.trim() === '') {
      setErrorMessage('Track title is required')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      const result = await createTrack({
        title: formData.title.trim(),
        slug: slug,
        summary: formData.summary.trim() || '',
        coverUrl: formData.coverUrl.trim() || undefined,
        minTier: 'member',
        description: formData.summary.trim() || '',
        publishedAt: new Date().toISOString(),
      })

      if (result.success) {
        setUploadStatus('success')
        toast.success('Track created successfully!')
        setFormData({
          title: '',
          summary: '',
          coverUrl: '',
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setUploadStatus('error')
        setErrorMessage('Failed to create track')
      }
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create track')
      toast.error('Failed to create track')
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
              <BookOpen className="w-5 h-5 text-yellow-500" />
              <span>Create New Learning Track</span>
            </CardTitle>
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-2 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="track-title" className="flex items-center gap-2">
              Track Title
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="track-title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value })
                setErrorMessage('')
              }}
              placeholder="e.g., Introduction to Cryptocurrency Trading"
              required
              disabled={isUploading}
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Description</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Brief description of what students will learn..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="cover-url">Cover Image URL (Optional)</Label>
            <Input
              id="cover-url"
              value={formData.coverUrl}
              onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
              placeholder="https://example.com/cover-image.jpg"
              type="url"
              disabled={isUploading}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Success!</p>
                <p className="text-sm text-green-700 mt-1">Track created successfully. You can now upload videos to it.</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-6 text-base"
            disabled={isUploading || !formData.title}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating Track...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Create Learning Track
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

