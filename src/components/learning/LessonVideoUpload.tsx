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
  const [uploadProgress, setUploadProgress] = useState(0)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video: null as File | null,
    duration: null as number | null,
  })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      
      // Extract video duration
      let duration: number | null = null
      try {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.src = URL.createObjectURL(file)
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src)
            duration = Math.round(video.duration)
            resolve(duration)
          }
          video.onerror = () => {
            window.URL.revokeObjectURL(video.src)
            reject(new Error('Failed to load video metadata'))
          }
        })
      } catch (error) {
        console.warn('Failed to extract video duration:', error)
        // Continue without duration - it's optional
      }
      
      setFormData({ ...formData, video: file, duration })
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
    setUploadProgress(0)

    try {
      // Upload video to Vercel Blob Storage first
      const { uploadToBlob } = await import('@/lib/blob-upload')
      
      const uploadResult = await uploadToBlob({
        file: formData.video,
        folder: 'lessons',
        onProgress: (progress) => {
          setUploadProgress(progress)
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
          duration: formData.duration,
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
        setUploadProgress(100)
        toast.success('Video lesson uploaded successfully!')
        setFormData({
          title: '',
          description: '',
          video: null,
          duration: null,
        })
        // Defer callback to avoid state updates during render
        setTimeout(() => {
          onUploadSuccess?.()
        }, 0)
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadProgress(0)
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
      <CardHeader className="border-b border-slate-200 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Video className="h-5 w-5 text-yellow-600" />
          Upload Video Lesson
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lesson Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              Lesson Title
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value })
                setErrorMessage('')
              }}
              placeholder="e.g., Introduction to Bitcoin"
              required
              disabled={isUploading}
              className={uploadStatus === 'error' && !formData.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
          </div>

          {/* Video File */}
          <div className="space-y-2">
            <Label htmlFor="video" className="flex items-center gap-2">
              Video File
              <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="video"
                className={`flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  formData.video
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-yellow-500 hover:bg-yellow-50'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    {formData.video ? formData.video.name : 'Select video file'}
                  </span>
                </div>
                <input
                  type="file"
                  id="video"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              {formData.video && (
                <div className="text-sm text-slate-600">
                  {formatFileSize(formData.video.size)}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Select a video file from your computer to upload
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of the lesson content..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Upload Progress</span>
                <span className="font-medium text-slate-900">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-6 text-base"
            disabled={isUploading || !formData.title || !formData.video}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Uploading Lesson...'}
              </>
            ) : (
              'Upload Video Lesson'
            )}
          </Button>
        </form>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="mt-4 flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Lesson uploaded successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && errorMessage && (
          <div className="mt-4 flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

