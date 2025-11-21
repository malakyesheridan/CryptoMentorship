'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { json } from '@/lib/http'
import { toast } from 'sonner'

interface DailySignalUploadProps {
  tier: 'T1' | 'T2' | 'T3'
  category?: 'majors' | 'memecoins'
  userRole?: string
}

const tierLabels = {
  T1: 'T1 - Basic Tier',
  T2: 'T2 - Premium Tier',
  T3: 'T3 - Elite Tier',
}

export default function DailySignalUpload({ tier, category, userRole }: DailySignalUploadProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    signal: '',
    executiveSummary: '',
    associatedData: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.signal.trim()) {
      setErrorMessage('Please enter a signal')
      setUploadStatus('error')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      const requestBody = {
        tier,
        ...(tier === 'T3' && category ? { category } : {}),
        signal: formData.signal.trim(),
        executiveSummary: formData.executiveSummary.trim() || undefined,
        associatedData: formData.associatedData.trim() || undefined,
      }

      console.log(`Creating ${tier}${category ? ` ${category}` : ''} daily signal:`, requestBody)

      const result = await json<{ id: string } | { error: string; details?: any[] }>('/api/admin/portfolio-daily-signals', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      console.log('Daily signal creation response:', result)

      if ('error' in result) {
        const errorDetails = result.details?.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ') || result.error
        throw new Error(errorDetails)
      }

      const categoryLabel = category === 'majors' ? 'Market Rotation' : category === 'memecoins' ? 'Memecoins' : ''
      toast.success(`${tierLabels[tier]}${categoryLabel ? ` ${categoryLabel}` : ''} signal posted successfully!`)
      setUploadStatus('success')
      setFormData({
        signal: '',
        executiveSummary: '',
        associatedData: '',
      })
      
      // Refresh the page to show the new signal
      router.refresh()
      
      setTimeout(() => {
        setUploadStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Daily signal creation error:', error)
      setUploadStatus('error')
      const errorMsg = error instanceof Error ? error.message : 'Failed to create signal'
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  if (userRole !== 'admin' && userRole !== 'editor') {
    return null
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Signal */}
        <div className="space-y-2">
          <Label htmlFor={`signal-${tier}`}>Signal *</Label>
          <Input
            id={`signal-${tier}`}
            value={formData.signal}
            onChange={(e) => setFormData({ ...formData, signal: e.target.value })}
            placeholder="e.g., 100% Cash 💰"
            required
            disabled={isUploading}
            maxLength={500}
          />
          <p className="text-xs text-slate-500">
            Main signal text (e.g., &quot;100% Cash&quot;, &quot;50% BTC / 50% ETH&quot;)
          </p>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <Label htmlFor={`summary-${tier}`}>Executive Summary</Label>
          <Textarea
            id={`summary-${tier}`}
            value={formData.executiveSummary}
            onChange={(e) => setFormData({ ...formData, executiveSummary: e.target.value })}
            placeholder="Positions will continue to be actively managed. Check in every day, signals will change frequently."
            rows={3}
            disabled={isUploading}
          />
          <p className="text-xs text-slate-500">
            Brief summary of the signal and management approach
          </p>
        </div>

        {/* Associated Data */}
        <div className="space-y-2">
          <Label htmlFor={`data-${tier}`}>Associated Data / Conditions</Label>
          <Textarea
            id={`data-${tier}`}
            value={formData.associatedData}
            onChange={(e) => setFormData({ ...formData, associatedData: e.target.value })}
            placeholder="BTC leverage condition = BTC Leverage Impermissible ❌💀"
            rows={2}
            disabled={isUploading}
          />
          <p className="text-xs text-slate-500">
            Additional conditions, warnings, or data points
          </p>
        </div>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Update posted successfully! It will replace any existing update for this tier today.</span>
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
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-6 text-lg"
          disabled={isUploading || !formData.signal.trim()}
        >
          {isUploading 
            ? 'Posting Update...' 
            : `Post ${tierLabels[tier]}${category === 'majors' ? ' Market Rotation' : category === 'memecoins' ? ' Memecoins' : ''} Update`}
        </Button>
      </form>
    </div>
  )
}

