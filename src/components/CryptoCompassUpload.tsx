'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Play, Shield, Upload } from 'lucide-react'

export default function CryptoCompassUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  // Episode form data
  const [episodeData, setEpisodeData] = useState({
    title: '',
    description: '',
    video: null as File | null,
    duration: null as number | null,
  })

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (1GB limit)
      const maxFileSize = 1024 * 1024 * 1024 // 1GB
      if (file.size > maxFileSize) {
        setErrorMessage(`File too large. Maximum size is 1GB. Your file is ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB`)
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
      
      setEpisodeData({ ...episodeData, video: file, duration })
      setErrorMessage('')
      setUploadStatus('idle')
    }
  }

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
    setUploadProgress(0)

    // Validate required fields
    if (!episodeData.title || episodeData.title.trim() === '') {
      setErrorMessage('Episode title is required')
      setUploadStatus('error')
      return
    }

    if (!episodeData.video) {
      setErrorMessage('Please select a video file to upload')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      const slug = generateSlug(episodeData.title)
      
      // Upload video to Vercel Blob Storage
      const { uploadToBlob } = await import('@/lib/blob-upload')
      
      const uploadResult = await uploadToBlob({
        file: episodeData.video,
        folder: 'episodes',
        onProgress: (progress) => {
          setUploadProgress(progress)
        }
      })

      if (!uploadResult.success || !uploadResult.url) {
        setUploadStatus('error')
        setErrorMessage(uploadResult.error || 'Upload failed')
        return
      }

      // Create episode record with uploaded video URL
      const response = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: episodeData.title,
          description: episodeData.description || '',
          slug: slug,
          videoUrl: uploadResult.url,
          duration: episodeData.duration,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        setUploadStatus('error')
        setErrorMessage(error.error || `Failed to create episode: HTTP ${response.status}`)
        return
      }

      const result = await response.json()
      if (result.id) {
        setUploadStatus('success')
        setUploadProgress(100)
        setEpisodeData({
          title: '',
          description: '',
          video: null,
          duration: null,
        })
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setUploadStatus('error')
        setErrorMessage('Failed to create episode')
      }
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
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
              Episode Name
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
          </div>

          {/* Video File Upload */}
          <div className="space-y-2">
            <Label htmlFor="video-file" className="flex items-center gap-2">
              Video File
              <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="video-file"
                className={`flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  episodeData.video
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-yellow-500 hover:bg-yellow-50'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    {episodeData.video ? episodeData.video.name : 'Select video file'}
                  </span>
                </div>
                <input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {episodeData.video && (
                <div className="text-sm text-slate-600">
                  {formatFileSize(episodeData.video.size)}
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
              value={episodeData.description}
              onChange={(e) => setEpisodeData({ ...episodeData, description: e.target.value })}
              placeholder="Brief description of the episode..."
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
            disabled={isUploading || !episodeData.title || !episodeData.video}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Uploading Episode...'}
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
