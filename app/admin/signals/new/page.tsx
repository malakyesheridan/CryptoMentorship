'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface SignalFormData {
  symbol: string
  market: string
  direction: 'long' | 'short'
  thesis: string
  tags: string[]
  entryTime: string
  entryPrice: string
  stopLoss: string
  takeProfit: string
  conviction: number
  riskPct: string
}

export default function NewSignalPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignalFormData>({
    symbol: '',
    market: 'crypto:spot',
    direction: 'long',
    thesis: '',
    tags: [],
    entryTime: new Date().toISOString().slice(0, 16),
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    conviction: 3,
    riskPct: ''
  })
  const [newTag, setNewTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: keyof SignalFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Implement actual API call
      console.log('Creating signal:', formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      router.push('/admin/signals')
    } catch (error) {
      console.error('Error creating signal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/signals">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Signals
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New Signal</h1>
              <p className="text-slate-600 mt-2">
                Add a new trading signal to the portfolio
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Symbol *
                  </label>
                  <Input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => handleInputChange('symbol', e.target.value)}
                    placeholder="BTC, ETH, SOL..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Market
                  </label>
                  <select
                    value={formData.market}
                    onChange={(e) => handleInputChange('market', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="crypto:spot">Crypto Spot</option>
                    <option value="crypto:perp">Crypto Perpetual</option>
                    <option value="crypto:futures">Crypto Futures</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Direction *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="long"
                      checked={formData.direction === 'long'}
                      onChange={(e) => handleInputChange('direction', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-green-600 font-medium">Long</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="short"
                      checked={formData.direction === 'short'}
                      onChange={(e) => handleInputChange('direction', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-red-600 font-medium">Short</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Details */}
          <Card>
            <CardHeader>
              <CardTitle>Trade Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Entry Time *
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.entryTime}
                    onChange={(e) => handleInputChange('entryTime', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Entry Price *
                  </label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={formData.entryPrice}
                    onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                    placeholder="50000.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Stop Loss
                  </label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={formData.stopLoss}
                    onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                    placeholder="48000.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Take Profit
                  </label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={formData.takeProfit}
                    onChange={(e) => handleInputChange('takeProfit', e.target.value)}
                    placeholder="55000.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Conviction (1-5)
                  </label>
                  <select
                    value={formData.conviction}
                    onChange={(e) => handleInputChange('conviction', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value={1}>1 - Very Low</option>
                    <option value={2}>2 - Low</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - High</option>
                    <option value={5}>5 - Very High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Risk Percentage
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.riskPct}
                    onChange={(e) => handleInputChange('riskPct', e.target.value)}
                    placeholder="2.0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Percentage of portfolio to risk on this trade
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thesis */}
          <Card>
            <CardHeader>
              <CardTitle>Trade Thesis</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Analysis & Reasoning
                </label>
                <textarea
                  value={formData.thesis}
                  onChange={(e) => handleInputChange('thesis', e.target.value)}
                  placeholder="Explain your analysis, reasoning, and expectations for this trade..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm min-h-[200px]"
                  rows={8}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Supports Markdown formatting
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/signals">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Signal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
