'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Upload, Video } from 'lucide-react'
import { toast } from 'sonner'

interface LessonVideoUploadProps {
  trackId: string
  onUploadSuccess?: () => void
}

export function LessonVideoUpload({ trackId, onUploadSuccess }: LessonVideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video: null as File | null,
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (100MB limit)
      const maxFileSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxFileSize) {
        setErrorMessage(`File too large. Maximum size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
        setUploadStatus('error')
        return
      }
      
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage('Invalid file type. Please upload an MP4, WebM, QuickTime, or AVI video file.')
        setUploadStatus('error')
        return
      }
      
      setFormData({ ...formData, video: file })
      setErrorMessage('')
      setUploadStatus('idle')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setErrorMessage('')
    setUploadStatus('idle')

    // Validate required fields
    if (!formData.title || formData.title.trim() === '') {
      setErrorMessage('Lesson title is required')
      setUploadStatus('error')
      return
    }

    if (!formData.video) {
      setErrorMessage('Please select a video file to upload')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      // Upload video to Vercel Blob Storage first
      const { uploadToBlob } = await import('@/lib/blob-upload')
      
      const uploadResult = await uploadToBlob({
        file: formData.video,
        folder: 'lessons',
        onProgress: (progress) => {
          // Progress tracking can be added here if needed
        }
      })

      if (!uploadResult.success || !uploadResult.url) {
        setUploadStatus('error')
        setErrorMessage(uploadResult.error || 'Video upload failed')
        toast.error(uploadResult.error || 'Failed to upload video')
        return
      }

      // Create lesson record with uploaded video URL
      const response = await fetch('/api/admin/learn/lessons/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || '',
          trackId: trackId,
          videoUrl: uploadResult.url,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        setUploadStatus('error')
        setErrorMessage(error.error || `Failed to create lesson: HTTP ${response.status}`)
        toast.error(error.error || 'Failed to create lesson')
        return
      }

      const result = await response.json()
      if (result.success) {
        setUploadStatus('success')
        toast.success('Video lesson uploaded successfully!')
        setFormData({
          title: '',
          description: '',
          video: null,
        })
        onUploadSuccess?.()
        setTimeout(() => {
          setUploadStatus('idle')
        }, 2000)
      } else {
        setUploadStatus('error')
        setErrorMessage(result.error || 'Failed to create lesson')
        toast.error(result.error || 'Failed to create lesson')
      }
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
      toast.error('Failed to upload video lesson')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-yellow-600" />
          Upload Video Lesson
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lesson Title */}
          <div>
            <Label htmlFor="title">
              Lesson Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Bitcoin"
              required
              disabled={isUploading}
            />
          </div>

          {/* Video File */}
          <div>
            <Label htmlFor="video">
              Video File *
            </Label>
            <div className="mt-2">
              <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                <input
                  type="file"
                  id="video"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <label htmlFor="video" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-green-600" />
                    {formData.video ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-slate-900">{formData.video.name}</p>
                        <p className="text-xs text-slate-500">
                          {(formData.video.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-900">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-500">
                          MP4, WebM, QuickTime, or AVI (MAX. 100MB)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Select a video file from your computer to upload
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of the lesson content..."
              rows={3}
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
                <p className="text-sm text-green-700 mt-1">Video lesson uploaded successfully.</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isUploading || !formData.title || !formData.video}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video Lesson
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

