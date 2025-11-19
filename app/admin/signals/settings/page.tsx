'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { json } from '@/lib/http'

interface PortfolioSettings {
  baseCapitalUsd: number
  positionModel: 'risk_pct' | 'fixed_fraction'
  slippageBps: number
  feeBps: number
}

export default function PortfolioSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<PortfolioSettings>({
    baseCapitalUsd: 10000,
    positionModel: 'risk_pct',
    slippageBps: 5,
    feeBps: 10
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await json<PortfolioSettings>('/api/admin/signals/settings')
        setSettings(data)
      } catch (error) {
        console.error('Error fetching portfolio settings:', error)
        toast.error('Failed to load portfolio settings')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await json('/api/admin/signals/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      
      toast.success('Portfolio settings saved successfully')
      router.push('/admin/settings')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save portfolio settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-slate-600 mt-2">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/settings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Portfolio Settings</h1>
              <p className="text-slate-600 mt-2">
                Configure parameters for portfolio performance calculations
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Capital & Position Sizing */}
          <Card>
            <CardHeader>
              <CardTitle>Capital & Position Sizing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Base Capital (USD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.baseCapitalUsd}
                  onChange={(e) => setSettings(prev => ({ ...prev, baseCapitalUsd: parseFloat(e.target.value) || 0 }))}
                  placeholder="10000.00"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Starting capital for performance calculations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Position Model
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="risk_pct"
                      checked={settings.positionModel === 'risk_pct'}
                      onChange={(e) => setSettings(prev => ({ ...prev, positionModel: e.target.value as 'risk_pct' | 'fixed_fraction' }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Risk Percentage</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="fixed_fraction"
                      checked={settings.positionModel === 'fixed_fraction'}
                      onChange={(e) => setSettings(prev => ({ ...prev, positionModel: e.target.value as 'risk_pct' | 'fixed_fraction' }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Fixed Fraction</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  How position sizes are calculated from trade parameters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trading Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Slippage (Basis Points)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    value={settings.slippageBps}
                    onChange={(e) => setSettings(prev => ({ ...prev, slippageBps: parseInt(e.target.value) || 0 }))}
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Expected slippage per trade (1 bp = 0.01%)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trading Fees (Basis Points)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    value={settings.feeBps}
                    onChange={(e) => setSettings(prev => ({ ...prev, feeBps: parseInt(e.target.value) || 0 }))}
                    placeholder="10"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Trading fees per trade (1 bp = 0.01%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Impact */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Current Settings Impact</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>• Base Capital: ${settings.baseCapitalUsd.toLocaleString()}</p>
                  <p>• Position Model: {settings.positionModel === 'risk_pct' ? 'Risk Percentage' : 'Fixed Fraction'}</p>
                  <p>• Slippage: {settings.slippageBps} bps ({(settings.slippageBps / 100).toFixed(2)}%)</p>
                  <p>• Fees: {settings.feeBps} bps ({(settings.feeBps / 100).toFixed(2)}%)</p>
                  <p>• Total Cost per Trade: {((settings.slippageBps + settings.feeBps) / 100).toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/settings">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
