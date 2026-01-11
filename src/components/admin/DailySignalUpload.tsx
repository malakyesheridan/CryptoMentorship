'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { json } from '@/lib/http'
import { toast } from 'sonner'
import { buildAllocationSplits, portfolioAssets, type PortfolioAsset } from '@/lib/portfolio-assets'

interface DailySignalUploadProps {
  tier: 'T1' | 'T2'
  category?: 'majors' | 'memecoins'
  userRole?: string
  existingSignal?: {
    id: string
    signal: string
    primaryAsset?: string | null
    secondaryAsset?: string | null
    tertiaryAsset?: string | null
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
  const [showPreview, setShowPreview] = useState(false)
  const isMemecoins = category === 'memecoins'

  const parseAssetsFromSignal = (signal: string): PortfolioAsset[] => {
    if (!signal) return []
    try {
      const parsed = JSON.parse(signal) as {
        primaryAsset?: string
        secondaryAsset?: string
        tertiaryAsset?: string
      }
      if (parsed && typeof parsed === 'object') {
        const assets: PortfolioAsset[] = []
        if (parsed.primaryAsset && portfolioAssets.includes(parsed.primaryAsset as PortfolioAsset)) {
          assets.push(parsed.primaryAsset as PortfolioAsset)
        }
        if (parsed.secondaryAsset && portfolioAssets.includes(parsed.secondaryAsset as PortfolioAsset)) {
          assets.push(parsed.secondaryAsset as PortfolioAsset)
        }
        if (parsed.tertiaryAsset && portfolioAssets.includes(parsed.tertiaryAsset as PortfolioAsset)) {
          assets.push(parsed.tertiaryAsset as PortfolioAsset)
        }
        if (assets.length > 0) {
          return assets
        }
      }
    } catch {
      // Not JSON, fall back to string parsing
    }

    const upperSignal = signal.toUpperCase()
    return portfolioAssets
      .map((asset) => ({ asset, index: upperSignal.indexOf(asset) }))
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.index - b.index)
      .map(({ asset }) => asset)
  }

  const getAssetDefaults = (signal?: DailySignalUploadProps['existingSignal']) => {
    if (!signal) {
      return { primaryAsset: '', secondaryAsset: '', tertiaryAsset: '' }
    }

    const parsedAssets = parseAssetsFromSignal(signal.signal)
    return {
      primaryAsset: signal.primaryAsset || parsedAssets[0] || '',
      secondaryAsset: signal.secondaryAsset || parsedAssets[1] || '',
      tertiaryAsset: signal.tertiaryAsset || parsedAssets[2] || '',
    }
  }

  const getSignalTextDefault = (signal?: DailySignalUploadProps['existingSignal']) => {
    if (!signal) {
      return ''
    }

    try {
      const parsed = JSON.parse(signal.signal) as {
        primaryAsset?: string
        secondaryAsset?: string
        tertiaryAsset?: string
      }
      if (
        parsed?.primaryAsset &&
        parsed?.secondaryAsset &&
        parsed?.tertiaryAsset
      ) {
        return ''
      }
    } catch {
      // Not JSON, fall back to raw text
    }

    return signal.signal
  }

  const [formData, setFormData] = useState({
    ...getAssetDefaults(existingSignal),
    signalText: getSignalTextDefault(existingSignal),
    executiveSummary: existingSignal?.executiveSummary || '',
    associatedData: existingSignal?.associatedData || '',
  })
  const hasPreviewAssets = Boolean(
    formData.primaryAsset &&
    formData.secondaryAsset &&
    formData.tertiaryAsset
  )
  const previewSplits = hasPreviewAssets
    ? buildAllocationSplits(
        formData.primaryAsset as PortfolioAsset,
        formData.secondaryAsset as PortfolioAsset,
        formData.tertiaryAsset as PortfolioAsset
      )
    : []
  const previewCategoryLabel = category === 'majors' ? 'Market Rotation' : category === 'memecoins' ? 'Memecoins' : ''

  // Update form when existingSignal changes
  useEffect(() => {
    if (existingSignal) {
      setFormData({
        ...getAssetDefaults(existingSignal),
        signalText: getSignalTextDefault(existingSignal),
        executiveSummary: existingSignal.executiveSummary || '',
        associatedData: existingSignal.associatedData || '',
      })
      setIsEditing(true)
      setShowPreview(false)
    } else {
      setFormData({
        ...getAssetDefaults(),
        signalText: '',
        executiveSummary: '',
        associatedData: '',
      })
      setIsEditing(false)
      setShowPreview(false)
    }
  }, [existingSignal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isMemecoins) {
      if (!formData.signalText.trim()) {
        setErrorMessage('Please enter the allocation update')
        setUploadStatus('error')
        return
      }
    } else if (!formData.primaryAsset || !formData.secondaryAsset || !formData.tertiaryAsset) {
      setErrorMessage('Please select a primary, secondary, and tertiary asset')
      setUploadStatus('error')
      return
    }

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
              ...(isMemecoins
                ? { signal: formData.signalText.trim() }
                : {
                    primaryAsset: formData.primaryAsset,
                    secondaryAsset: formData.secondaryAsset,
                    tertiaryAsset: formData.tertiaryAsset,
                  }),
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
          ...(isMemecoins
            ? { signal: formData.signalText.trim() }
            : {
                primaryAsset: formData.primaryAsset,
                secondaryAsset: formData.secondaryAsset,
                tertiaryAsset: formData.tertiaryAsset,
              }),
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
          ...getAssetDefaults(),
          signalText: '',
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
        {isMemecoins ? (
          <div className="space-y-2">
            <Label htmlFor={`signal-text-${tier}`}>Allocation *</Label>
            <Textarea
              id={`signal-text-${tier}`}
              value={formData.signalText}
              onChange={(e) => setFormData({ ...formData, signalText: e.target.value })}
              placeholder="Enter the memecoin allocation update..."
              required
              disabled={isUploading}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Provide the allocation update for memecoins
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`primary-asset-${tier}`}>Primary Asset *</Label>
              <Select
                id={`primary-asset-${tier}`}
                value={formData.primaryAsset}
                onChange={(e) => setFormData({ ...formData, primaryAsset: e.target.value })}
                disabled={isUploading}
                required
              >
                <option value="" disabled>Select primary asset</option>
                {portfolioAssets.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`secondary-asset-${tier}`}>Secondary Asset *</Label>
              <Select
                id={`secondary-asset-${tier}`}
                value={formData.secondaryAsset}
                onChange={(e) => setFormData({ ...formData, secondaryAsset: e.target.value })}
                disabled={isUploading}
                required
              >
                <option value="" disabled>Select secondary asset</option>
                {portfolioAssets.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`tertiary-asset-${tier}`}>Tertiary Asset *</Label>
              <Select
                id={`tertiary-asset-${tier}`}
                value={formData.tertiaryAsset}
                onChange={(e) => setFormData({ ...formData, tertiaryAsset: e.target.value })}
                disabled={isUploading}
                required
              >
                <option value="" disabled>Select tertiary asset</option>
                {portfolioAssets.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-slate-500">
                Select the primary, secondary, and tertiary assets for allocation splits
              </p>
            </div>
          </div>
        )}

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

        {/* Preview */}
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-slate-900">Preview</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>

        {showPreview && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Portfolio Update - {tierLabels[tier]}{previewCategoryLabel ? ` ${previewCategoryLabel}` : ''}
              </h4>
              <span className="text-xs text-slate-500">Preview</span>
            </div>

            {!isMemecoins && hasPreviewAssets ? (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-slate-900 mb-2">Allocation Split:</h5>
                <div className="space-y-2 text-sm text-slate-800">
                  {previewSplits.map((split) => (
                    <div key={split.label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-semibold text-slate-900">{split.label}</span>
                      <span className="text-slate-700">
                        {split.allocations
                          .map((allocation) => `${allocation.percent}% ${allocation.asset}`)
                          .join(' / ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : isMemecoins ? (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-slate-900 mb-2">Update:</h5>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {formData.signalText.trim() || 'Enter the memecoin allocation update to preview.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-4">
                Select primary, secondary, and tertiary assets to preview the allocation split.
              </p>
            )}

            {formData.executiveSummary.trim() && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-slate-900 mb-2">Executive Summary:</h5>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.executiveSummary}</p>
              </div>
            )}

            {formData.associatedData.trim() && (
              <div>
                <h5 className="text-sm font-semibold text-slate-900 mb-2">Associated Data:</h5>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.associatedData}</p>
              </div>
            )}
          </div>
        )}

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
          disabled={
            isUploading ||
            (isMemecoins
              ? !formData.signalText.trim()
              : !formData.primaryAsset ||
                !formData.secondaryAsset ||
                !formData.tertiaryAsset)
          }
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

