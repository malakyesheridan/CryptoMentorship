'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Upload, X, CheckCircle, AlertCircle, Video } from 'lucide-react'

interface CryptoCompassVideoUploadProps {
  onUploadSuccess?: () => void
}

export default function CryptoCompassVideoUpload({ onUploadSuccess }: CryptoCompassVideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'member',
    video: null as File | null,
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFormData({ ...formData, video: file })
      setErrorMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 Starting video upload...')
    console.log('📋 Form data:', {
      hasVideo: !!formData.video,
      title: formData.title,
      description: formData.description,
      visibility: formData.visibility
    })
    
    if (!formData.video || !formData.title) {
      console.log('❌ Missing required fields')
      setErrorMessage('Please select a video file and enter a title')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')

    try {
      console.log('📦 Creating FormData...')
      const uploadFormData = new FormData()
      uploadFormData.append('video', formData.video)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('visibility', formData.visibility)

      console.log('🌐 Sending request to /api/videos-simple...')
      const response = await fetch('/api/videos-simple', {
        method: 'POST',
        body: uploadFormData,
      })

      console.log('📡 Response received:', response.status, response.statusText)
      const result = await response.json()
      console.log('📄 Response data:', result)

      if (result.ok) {
        console.log('✅ Upload successful!')
        setUploadStatus('success')
        setFormData({
          title: '',
          description: '',
          visibility: 'member',
          video: null,
        })
        onUploadSuccess?.()
        // Refresh the page to show the new video
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        console.log('❌ Upload failed:', result.message)
        throw new Error(result.message || 'Upload failed')
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <Card className="card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="w-5 h-5" />
          <span>Upload Crypto Compass Video</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="video">Video File *</Label>
            <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-lg p-4 text-center hover:border-[var(--border-subtle)] transition-colors">
              <input
                type="file"
                id="video"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <label htmlFor="video" className="cursor-pointer">
                {formData.video ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                    <p className="font-medium text-[var(--text-strong)]">{formData.video.name}</p>
                    <p className="text-sm text-[var(--text-strong)]">{formatFileSize(formData.video.size)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, video: null })}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
                    <p className="font-medium text-[var(--text-strong)]">Click to select video file</p>
                    <p className="text-sm text-[var(--text-strong)]">MP4, WebM, MOV, AVI up to 1GB</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter video title"
              required
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description for this video"
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-[#1a1815] disabled:cursor-not-allowed"
            >
              <option value="public">Public - Everyone can view</option>
              <option value="member">Member - Members only</option>
              <option value="admin">Admin - Admins only</option>
            </select>
          </div>

          {/* Status Messages */}
          {uploadStatus === 'success' && (
            <div className="flex items-center space-x-2 text-[#4a7c3f]">
              <CheckCircle className="w-5 h-5" />
              <span>Video uploaded successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center space-x-2 text-[#c03030]">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="btn-gold w-full"
            disabled={isUploading || !formData.video || !formData.title}
          >
            {isUploading ? 'Uploading...' : 'Upload Crypto Compass Video'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
