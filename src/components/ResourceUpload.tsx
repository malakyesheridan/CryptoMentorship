'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react'

export default function ResourceUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'member',
    tags: '',
    file: null as File | null,
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type (PDF only for resources)
      if (file.type !== 'application/pdf') {
        setErrorMessage('Please select a PDF file only')
        return
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File size must be less than 50MB')
        return
      }

      setFormData({ ...formData, file })
      setErrorMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Starting resource upload...')
    console.log('📋 Form data:', {
      hasFile: !!formData.file,
      title: formData.title,
      description: formData.description,
      visibility: formData.visibility
    })

    if (!formData.file || !formData.title) {
      console.log('❌ Missing required fields')
      setErrorMessage('Please select a PDF file and enter a title')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')

    try {
      console.log('📦 Creating FormData...')
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('visibility', formData.visibility)
      uploadFormData.append('tags', formData.tags)
      uploadFormData.append('kind', 'resource')

      console.log('🌐 Sending request to /api/resources/upload...')
      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      console.log('📡 Response received:', response.status, response.statusText)
      const result = await response.json()
      console.log('📄 Response data:', result)

      if (response.ok && result.ok) {
        console.log('✅ Upload successful!')
        setUploadStatus('success')
        setFormData({
          title: '',
          description: '',
          visibility: 'member',
          tags: '',
          file: null,
        })
        // Refresh the page to show the new resource
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

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <Card className="card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Upload Resource Document</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">PDF Document *</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
              <input
                type="file"
                id="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <label htmlFor="file" className="cursor-pointer">
                {formData.file ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                    <p className="font-medium text-slate-800">{formData.file.name}</p>
                    <p className="text-sm text-slate-600">{formatFileSize(formData.file.size)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, file: null })}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="font-medium text-slate-800">Click to select PDF file</p>
                    <p className="text-sm text-slate-600">PDF files up to 50MB</p>
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
              placeholder="Enter resource title"
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
              placeholder="Optional description for this resource"
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Tags/Categories */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags/Categories</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., guide, tutorial, reference (comma-separated)"
              disabled={isUploading}
            />
            <p className="text-xs text-slate-500">
              Separate multiple tags with commas. These will be used for filtering and categorization.
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
              <span>Resource uploaded successfully!</span>
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
            className="btn-gold w-full"
            disabled={isUploading || !formData.file || !formData.title}
          >
            {isUploading ? 'Uploading...' : 'Upload Resource Document'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
