'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Play, Shield, Upload } from 'lucide-react'
import {
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_UPLOAD_MIME_TYPES,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_UPLOAD_MIME_TYPES,
  formatBytes
} from '@/lib/upload-config'

export default function CryptoCompassUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  const [episodeData, setEpisodeData] = useState({
    title: '',
    description: '',
    video: null as File | null,
    thumbnail: null as File | null,
    duration: null as number | null,
  })

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview)
      }
    }
  }, [thumbnailPreview])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > VIDEO_MAX_SIZE_BYTES) {
      setErrorMessage(`File too large. Maximum size is ${formatBytes(VIDEO_MAX_SIZE_BYTES)}. Your file is ${formatBytes(file.size)}.`)
      setUploadStatus('error')
      return
    }

    if (!VIDEO_UPLOAD_MIME_TYPES.includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload an MP4, WebM, QuickTime, or AVI video file.')
      setUploadStatus('error')
      return
    }

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
    }

    setEpisodeData((prev) => ({ ...prev, video: file, duration }))
    setErrorMessage('')
    setUploadStatus('idle')
  }

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type)) {
      setErrorMessage('Invalid thumbnail file type. Please upload JPG, PNG, WebP, or GIF.')
      setUploadStatus('error')
      return
    }

    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      setErrorMessage(`Thumbnail too large. Maximum size is ${formatBytes(IMAGE_MAX_SIZE_BYTES)}. Your file is ${formatBytes(file.size)}.`)
      setUploadStatus('error')
      return
    }

    const nextPreview = URL.createObjectURL(file)
    setThumbnailPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return nextPreview
    })
    setEpisodeData((prev) => ({ ...prev, thumbnail: file }))
    setErrorMessage('')
    setUploadStatus('idle')
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

    setErrorMessage('')
    setUploadStatus('idle')
    setUploadProgress(0)
    setThumbnailUploadProgress(0)

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
      let coverUrl: string | undefined

      if (episodeData.thumbnail) {
        const { uploadToBlob } = await import('@/lib/blob-upload')
        const thumbnailUpload = await uploadToBlob({
          file: episodeData.thumbnail,
          folder: 'episodes/thumbnails',
          onProgress: (progress) => {
            setThumbnailUploadProgress(progress)
          }
        })

        if (!thumbnailUpload.success || !thumbnailUpload.url) {
          setUploadStatus('error')
          setErrorMessage(thumbnailUpload.error || 'Thumbnail upload failed')
          return
        }

        coverUrl = thumbnailUpload.url
      }

      const { uploadCryptoCompassVideo } = await import('@/lib/crypto-compass-upload')
      const uploadResult = await uploadCryptoCompassVideo({
        file: episodeData.video,
        onProgress: (progress) => {
          setUploadProgress(progress)
        },
      })

      if (!uploadResult.success || !uploadResult.url) {
        setUploadStatus('error')
        setErrorMessage(uploadResult.error || 'Upload failed')
        return
      }

      const response = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: episodeData.title,
          description: episodeData.description || '',
          slug,
          videoUrl: uploadResult.url,
          coverUrl,
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
          thumbnail: null,
          duration: null,
        })
        setThumbnailPreview((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return null
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

  return (
    <Card className="bg-[var(--bg-panel)] rounded-2xl shadow-lg border border-[var(--border-subtle)]">
      <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Play className="w-5 h-5 text-yellow-500" />
              <span>Create New Crypto Compass Episode</span>
            </CardTitle>
            <Badge className="bg-[#2a2418] text-yellow-700 border-[var(--gold-400)]/30 px-2 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEpisodeSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="episode-title" className="flex items-center gap-2">
              Episode Name
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="episode-title"
              value={episodeData.title}
              onChange={(e) => {
                setEpisodeData((prev) => ({ ...prev, title: e.target.value }))
                setErrorMessage('')
              }}
              placeholder="e.g., Market Outlook: Q4 2024 Analysis"
              required
              disabled={isUploading}
              className={uploadStatus === 'error' && !episodeData.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
          </div>

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
                    ? 'border-green-500 bg-[#1a2e1a]'
                    : 'border-[var(--border-subtle)] hover:border-yellow-500 hover:bg-[#2a2418]'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-[var(--text-strong)]" />
                  <span className="text-sm text-[var(--text-strong)]">
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
                <div className="text-sm text-[var(--text-strong)]">
                  {formatBytes(episodeData.video.size)}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Select a video file from your computer to upload
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail-file">Thumbnail Image (Optional)</Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="thumbnail-file"
                className={`flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  episodeData.thumbnail
                    ? 'border-green-500 bg-[#1a2e1a]'
                    : 'border-[var(--border-subtle)] hover:border-yellow-500 hover:bg-[#2a2418]'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-[var(--text-strong)]" />
                  <span className="text-sm text-[var(--text-strong)]">
                    {episodeData.thumbnail ? episodeData.thumbnail.name : 'Select thumbnail image'}
                  </span>
                </div>
                <input
                  id="thumbnail-file"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {thumbnailPreview && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Optional poster image shown on episode cards and before playback (JPG, PNG, WebP, GIF up to {formatBytes(IMAGE_MAX_SIZE_BYTES)})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={episodeData.description}
              onChange={(e) => setEpisodeData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the episode..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-strong)]">Upload Progress</span>
                <span className="font-medium text-[var(--text-strong)]">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-[#2a2520] rounded-full h-2">
                <div
                  className="bg-gold-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {isUploading && thumbnailUploadProgress > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Thumbnail upload: {thumbnailUploadProgress}%
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-gold-500 hover:bg-gold-600 text-white font-medium py-6 text-base"
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

        {uploadStatus === 'success' && (
          <div className="mt-4 flex items-center space-x-2 text-[#4a7c3f]">
            <CheckCircle className="w-5 h-5" />
            <span>Episode created successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 flex items-center space-x-2 text-[#c03030]">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
