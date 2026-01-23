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
import { PdfAttachmentsField } from './PdfAttachmentsField'
import type { PdfResource } from '@/lib/learning/resources'
import { IMAGE_MAX_SIZE_BYTES, formatBytes } from '@/lib/upload-config'

interface SimpleTrackUploadProps {
  onSuccess?: () => void
}

export function SimpleTrackUpload({ onSuccess }: SimpleTrackUploadProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    coverImage: null as File | null,
    pdfResources: [] as PdfResource[],
  })
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [coverUploadProgress, setCoverUploadProgress] = useState(0)

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
    setCoverUploadProgress(0)

    try {
      // Upload cover image if provided
      let coverUrl: string | undefined = undefined
      if (formData.coverImage) {
        const { uploadToBlob } = await import('@/lib/blob-upload')
        const uploadResult = await uploadToBlob({
          file: formData.coverImage,
          folder: 'tracks',
          onProgress: (progress) => {
            setCoverUploadProgress(progress)
          }
        })

        if (!uploadResult.success || !uploadResult.url) {
          setUploadStatus('error')
          setErrorMessage(uploadResult.error || 'Cover image upload failed')
          setIsUploading(false)
          return
        }
        coverUrl = uploadResult.url
      }

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
        coverUrl: coverUrl,
        pdfResources: formData.pdfResources,
        minTier: 'member',
        publishedAt: new Date().toISOString(),
      })

      if (result.success) {
        setUploadStatus('success')
        toast.success('Track created successfully!')
        setFormData({
          title: '',
          summary: '',
          coverImage: null,
          pdfResources: [],
        })
        setCoverImagePreview(null)
        setCoverUploadProgress(0)
        // Call onSuccess callback if provided, otherwise reload
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 500)
        } else {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
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

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="cover-image">Cover Image (Optional)</Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="cover-image"
                className={`flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  formData.coverImage
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-yellow-500 hover:bg-yellow-50'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    {formData.coverImage ? formData.coverImage.name : 'Select cover image'}
                  </span>
                </div>
                <input
                  type="file"
                  id="cover-image"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        setErrorMessage('Please select an image file')
                        setUploadStatus('error')
                        return
                      }
                      // Validate file size (10MB limit)
                      if (file.size > IMAGE_MAX_SIZE_BYTES) {
                        setErrorMessage(`Image too large. Maximum size is ${formatBytes(IMAGE_MAX_SIZE_BYTES)}. Your file is ${formatBytes(file.size)}.`)
                        setUploadStatus('error')
                        return
                      }
                      setFormData({ ...formData, coverImage: file })
                      setCoverImagePreview(URL.createObjectURL(file))
                      setErrorMessage('')
                      setUploadStatus('idle')
                    }
                  }}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              {coverImagePreview && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-slate-300">
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Upload a cover image from your computer (JPG, PNG, WebP up to 10MB)
            </p>
          </div>

          <PdfAttachmentsField
            label="Track PDFs"
            helperText="Upload PDFs to share with students on the track page."
            value={formData.pdfResources}
            onChange={(next) => setFormData(prev => ({ ...prev, pdfResources: next }))}
            folder="learning/track-pdfs"
          />

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

