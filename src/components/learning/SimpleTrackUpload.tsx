'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Upload, BookOpen, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'
import { DbHealthBanner } from '@/components/admin/learning/DbHealthBanner'
import { PdfAttachmentsField } from './PdfAttachmentsField'
import type { PdfResource } from '@/lib/learning/resources'
import { IMAGE_MAX_SIZE_BYTES, formatBytes } from '@/lib/upload-config'

interface SimpleTrackUploadProps {
  onSuccess?: (track: { id: string; title: string; slug: string }) => void
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error'

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function createRequestId() {
  return `track_upload_${nanoid(10)}`
}

export function SimpleTrackUpload({ onSuccess }: SimpleTrackUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    coverImage: null as File | null,
    pdfResources: [] as PdfResource[],
  })
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [coverUploadProgress, setCoverUploadProgress] = useState(0)
  const generatedSlug = useMemo(() => normalizeSlug(formData.title), [formData.title])

  useEffect(() => {
    if (!generatedSlug) {
      setSlugStatus('idle')
      setSlugSuggestion(null)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setSlugStatus('checking')
        const response = await fetch(
          `/api/admin/learning-tracks/slug-available?slug=${encodeURIComponent(generatedSlug)}`,
          { cache: 'no-store', signal: controller.signal }
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          setSlugStatus('error')
          setSlugSuggestion(null)
          return
        }
        if (payload?.available) {
          setSlugStatus('available')
          setSlugSuggestion(null)
          return
        }
        setSlugStatus('taken')
        setSlugSuggestion(typeof payload?.suggestion === 'string' ? payload.suggestion : null)
      } catch {
        if (!controller.signal.aborted) {
          setSlugStatus('error')
          setSlugSuggestion(null)
        }
      }
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [generatedSlug])

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

      const healthResponse = await fetch('/api/health/db', { method: 'GET', cache: 'no-store' })
      const healthPayload = await healthResponse.json().catch(() => null)
      if (!healthResponse.ok || !healthPayload?.ok) {
        setUploadStatus('error')
        setErrorMessage(
          typeof healthPayload?.message === 'string'
            ? healthPayload.message
            : 'Database temporarily unreachable. Try again in 30 seconds.'
        )
        setIsUploading(false)
        return
      }

      const slug = slugSuggestion && slugStatus === 'taken' ? slugSuggestion : generatedSlug
      if (!slug) {
        setUploadStatus('error')
        setErrorMessage('Unable to generate a valid slug from track title.')
        setIsUploading(false)
        return
      }

      const response = await fetch('/api/admin/learning-tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          slug,
          summary: formData.summary.trim() || '',
          coverUrl: coverUrl,
          pdfResources: formData.pdfResources,
          minTier: 'member',
          publishedAt: new Date().toISOString(),
          requestId: createRequestId(),
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 409 && result?.error === 'slug_taken') {
          const suggestion = typeof result?.suggestion === 'string' ? result.suggestion : null
          if (suggestion) {
            setSlugSuggestion(suggestion)
            setSlugStatus('taken')
            setUploadStatus('error')
            setErrorMessage(`Track slug already exists. Suggested slug: ${suggestion}`)
            setIsUploading(false)
            return
          }
        }
        setUploadStatus('error')
        setErrorMessage(result?.message || result?.error || 'Failed to create track')
        setIsUploading(false)
        return
      }

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
            onSuccess(result.track)
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
    <Card className="bg-[var(--bg-panel)] rounded-2xl shadow-lg border border-[var(--border-subtle)]">
      <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              <span>Create New Learning Track</span>
            </CardTitle>
            <Badge className="bg-[#2a2418] text-yellow-700 border-[#2a2418] px-2 py-1 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DbHealthBanner />
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
            {generatedSlug && (
              <div className="text-xs">
                {slugStatus === 'available' && <span className="text-[#4a7c3f]">Slug available: {generatedSlug}</span>}
                {slugStatus === 'checking' && <span className="text-[var(--text-muted)]">Checking slug...</span>}
                {slugStatus === 'taken' && (
                  <span className="text-[#c03030]">
                    Slug taken. Suggested: {slugSuggestion || `${generatedSlug}-2`}
                  </span>
                )}
                {slugStatus === 'error' && <span className="text-[var(--text-muted)]">Could not validate slug right now.</span>}
              </div>
            )}
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
                    ? 'border-green-500 bg-[#1a2e1a]'
                    : 'border-[var(--border-subtle)] hover:border-yellow-500 hover:bg-[#2a2418]'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-[var(--text-strong)]" />
                  <span className="text-sm text-[var(--text-strong)]">
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
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
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
            <div className="bg-[#2e1a1a] border border-[#2e1a1a] rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#c03030] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#c03030]">Error</p>
                <p className="text-sm text-[#c03030] mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="bg-[#1a2e1a] border border-[#1a2e1a] rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-[#4a7c3f] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#4a7c3f]">Success!</p>
                <p className="text-sm text-[#4a7c3f] mt-1">Track created successfully. You can now upload videos to it.</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gold-500 hover:bg-gold-600 text-white font-medium py-6 text-base"
            disabled={isUploading || !formData.title || slugStatus === 'checking'}
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

