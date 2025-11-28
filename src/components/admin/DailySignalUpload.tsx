'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { json } from '@/lib/http'
import { toast } from 'sonner'

interface DailySignalUploadProps {
  tier: 'T1' | 'T2'
  category?: 'majors' | 'memecoins'
  userRole?: string
  existingSignal?: {
    id: string
    signal: string
    executiveSummary?: string | null
    associatedData?: string | null
  }
  onEditComplete?: () => void
}

const tierLabels = {
  T1: 'Growth',
  T2: 'Elite',
}

export default function DailySignalUpload({ tier, category, userRole, existingSignal, onEditComplete }: DailySignalUploadProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isEditing, setIsEditing] = useState(!!existingSignal)

  // Strip bullet points when loading existing signal for editing
  const stripBulletPoints = (text: string | null | undefined): string => {
    if (!text) return ''
    return text
      .split('\n')
      .map(line => line.trim().replace(/^•\s*/, '')) // Remove bullet point prefix
      .join('\n')
  }

  const [formData, setFormData] = useState({
    signal: stripBulletPoints(existingSignal?.signal),
    executiveSummary: existingSignal?.executiveSummary || '',
    associatedData: existingSignal?.associatedData || '',
  })

  // Update form when existingSignal changes
  useEffect(() => {
    if (existingSignal) {
      setFormData({
        signal: stripBulletPoints(existingSignal.signal),
        executiveSummary: existingSignal.executiveSummary || '',
        associatedData: existingSignal.associatedData || '',
      })
      setIsEditing(true)
    } else {
      setFormData({
        signal: '',
        executiveSummary: '',
        associatedData: '',
      })
      setIsEditing(false)
    }
  }, [existingSignal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.signal.trim()) {
      setErrorMessage('Please enter an update')
      setUploadStatus('error')
      return
    }
    
    // Use signal text as-is, no bullet point conversion
    const processedSignal = formData.signal.trim()

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')

    try {
      if (isEditing && existingSignal) {
        // Update existing signal
        const result = await json<{ id: string } | { error: string; details?: any[] }>(
          `/api/admin/portfolio-daily-signals/${existingSignal.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              signal: processedSignal,
              executiveSummary: formData.executiveSummary.trim() || undefined,
              associatedData: formData.associatedData.trim() || undefined,
            }),
          }
        )

        if ('error' in result) {
          const errorDetails = result.details?.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ') || result.error
          throw new Error(errorDetails)
        }

        toast.success('Update updated successfully!')
        setUploadStatus('success')
        setIsEditing(false)
        if (onEditComplete) {
          onEditComplete()
        }
        
        // Reset uploading state immediately so buttons remain clickable
        setIsUploading(false)
        
        // Refresh the page to show the updated signal
        setTimeout(() => {
          router.refresh()
          setUploadStatus('idle')
        }, 500)
      } else {
        // Create new signal
        const requestBody = {
          tier,
          ...(tier === 'T2' && category ? { category } : {}),
          signal: processedSignal,
          executiveSummary: formData.executiveSummary.trim() || undefined,
          associatedData: formData.associatedData.trim() || undefined,
        }

        console.log(`Creating ${tier}${category ? ` ${category}` : ''} daily update:`, requestBody)

        const result = await json<{ id: string } | { error: string; details?: any[] }>('/api/admin/portfolio-daily-signals', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        })

        console.log('Daily update creation response:', result)

        if ('error' in result) {
          const errorDetails = result.details?.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ') || result.error
          throw new Error(errorDetails)
        }

        const categoryLabel = category === 'majors' ? 'Market Rotation' : category === 'memecoins' ? 'Memecoins' : ''
        toast.success(`${tierLabels[tier]}${categoryLabel ? ` ${categoryLabel}` : ''} update posted successfully!`)
        setUploadStatus('success')
        setFormData({
          signal: '',
          executiveSummary: '',
          associatedData: '',
        })
        
        // Reset uploading state immediately so buttons remain clickable
        setIsUploading(false)
        
        // Refresh the page to show the new signal (but don't block UI)
        setTimeout(() => {
          router.refresh()
          setUploadStatus('idle')
        }, 500) // Small delay to ensure state is reset
      }
    } catch (error) {
      console.error('Daily update creation error:', error)
      setUploadStatus('error')
      const errorMsg = error instanceof Error ? error.message : 'Failed to create update'
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
          <Label htmlFor={`signal-${tier}`}>Update *</Label>
          <Textarea
            id={`signal-${tier}`}
            value={formData.signal}
            onChange={(e) => setFormData({ ...formData, signal: e.target.value })}
            placeholder="e.g., 100% Cash 💰"
            required
            disabled={isUploading}
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-slate-500">
            Main update text
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
            ? (isEditing ? 'Updating...' : 'Posting Update...')
            : isEditing
              ? 'Update'
              : `Post ${tierLabels[tier]}${category === 'majors' ? ' Market Rotation' : category === 'memecoins' ? ' Memecoins' : ''} Update`}
        </Button>
      </form>
    </div>
  )
}

