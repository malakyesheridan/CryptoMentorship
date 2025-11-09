'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

export default function SignalUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'member',
    tags: '',
    signalType: 'long',
    conviction: '3',
    riskPct: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Starting signal upload...')
    console.log('📋 Form data:', formData)

    if (!formData.title) {
      console.log('❌ Missing required fields')
      setErrorMessage('Please enter a signal title')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')

    try {
      console.log('🌐 Sending request to /api/admin/signals...')
      const response = await fetch('/api/admin/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          visibility: formData.visibility,
          tags: formData.tags,
          signalType: formData.signalType,
          conviction: parseInt(formData.conviction),
          riskPct: formData.riskPct ? parseFloat(formData.riskPct) : null,
          kind: 'signal',
        }),
      })

      console.log('📡 Response received:', response.status, response.statusText)
      const result = await response.json()
      console.log('📄 Response data:', result)

      if (response.ok && result.ok) {
        console.log('✅ Signal upload successful!')
        setUploadStatus('success')
        setFormData({
          title: '',
          description: '',
          visibility: 'member',
          tags: '',
          signalType: 'long',
          conviction: '3',
          riskPct: '',
        })
        // Refresh the page to show the new signal
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Create New Investment Signal</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Signal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., BTC Long Entry - Technical Breakout"
              required
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Analysis & Rationale</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed analysis, entry rationale, and market context..."
              rows={4}
              disabled={isUploading}
            />
          </div>

          {/* Signal Type */}
          <div className="space-y-2">
            <Label htmlFor="signalType">Signal Type</Label>
            <select
              value={formData.signalType}
              onChange={(e) => setFormData({ ...formData, signalType: e.target.value })}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="long">Long Position</option>
              <option value="short">Short Position</option>
              <option value="neutral">Neutral/Hold</option>
            </select>
          </div>

          {/* Conviction Level */}
          <div className="space-y-2">
            <Label htmlFor="conviction">Conviction Level (1-5)</Label>
            <select
              value={formData.conviction}
              onChange={(e) => setFormData({ ...formData, conviction: e.target.value })}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="1">1 - Low Conviction</option>
              <option value="2">2 - Below Average</option>
              <option value="3">3 - Average</option>
              <option value="4">4 - High Conviction</option>
              <option value="5">5 - Maximum Conviction</option>
            </select>
          </div>

          {/* Risk Percentage */}
          <div className="space-y-2">
            <Label htmlFor="riskPct">Risk Percentage (Optional)</Label>
            <Input
              id="riskPct"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.riskPct}
              onChange={(e) => setFormData({ ...formData, riskPct: e.target.value })}
              placeholder="e.g., 2.5"
              disabled={isUploading}
            />
            <p className="text-xs text-slate-500">
              Recommended risk percentage of portfolio for this position
            </p>
          </div>

          {/* Tags/Categories */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags/Categories</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., Bitcoin, Technical Analysis, Breakout (comma-separated)"
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
              <span>Signal created successfully!</span>
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
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            disabled={isUploading || !formData.title}
          >
            {isUploading ? 'Creating Signal...' : 'Create Investment Signal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
