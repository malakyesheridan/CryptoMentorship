'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/admin/FileUpload'
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { json } from '@/lib/http'
import { toast } from 'sonner'

export default function SignalUpload() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    symbol: '',
    description: '',
    tags: '',
    entryPrice: '',
    coverUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.symbol.trim()) {
      setErrorMessage('Please enter a symbol (e.g., BTC, ETH)')
      setUploadStatus('error')
      return
    }
    
    if (!formData.entryPrice || parseFloat(formData.entryPrice) <= 0) {
      setErrorMessage('Please enter a valid entry price (greater than 0)')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      // Parse tags
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : []

      const requestBody = {
        symbol: formData.symbol.toUpperCase().trim(),
        market: 'crypto:spot',
        direction: 'long' as const, // Default to long
        thesis: formData.description.trim() || undefined,
        tags: tagsArray,
        entryTime: new Date().toISOString(),
        entryPrice: parseFloat(formData.entryPrice),
      }

      console.log('Creating signal with body:', requestBody)

      // Use json helper for better error handling
      const result = await json<{ id: string; symbol: string } | { error: string; details?: any[] }>('/api/admin/signals', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      console.log('Signal creation response:', result)

      // Check if it's an error response
      if ('error' in result) {
        const errorDetails = result.details?.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ') || result.error
        throw new Error(errorDetails)
      }

      // Success!
      toast.success('Signal created successfully!')
      setUploadStatus('success')
      setFormData({
        symbol: '',
        description: '',
        tags: '',
        entryPrice: '',
        coverUrl: '',
      })
      
      // Refresh the page data without full reload
      router.refresh()
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setUploadStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Signal creation error:', error)
      setUploadStatus('error')
      const errorMsg = error instanceof Error ? error.message : 'Failed to create signal'
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
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
          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol *</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., BTC, ETH, SOL"
              required
              disabled={isUploading}
              maxLength={10}
            />
            <p className="text-xs text-slate-500">
              The cryptocurrency or asset symbol
            </p>
          </div>

          {/* Entry Price */}
          <div className="space-y-2">
            <Label htmlFor="entryPrice">Entry Price *</Label>
            <Input
              id="entryPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.entryPrice}
              onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
              placeholder="e.g., 45000.00"
              required
              disabled={isUploading}
            />
            <p className="text-xs text-slate-500">
              The entry price for this position
            </p>
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

          {/* Image Upload */}
          <div className="space-y-2">
            <FileUpload
              value={formData.coverUrl}
              onChange={(url) => setFormData({ ...formData, coverUrl: url })}
              label="Signal Image (Optional)"
            />
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
            disabled={isUploading || !formData.symbol || !formData.entryPrice}
          >
            {isUploading ? 'Creating Signal...' : 'Create Investment Signal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
