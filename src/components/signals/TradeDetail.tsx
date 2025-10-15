'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercentage, formatDate, formatNumber } from '@/lib/perf/format'
import { MDXRenderer } from '@/components/MDXRenderer'
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Target, Shield } from 'lucide-react'

interface Trade {
  id: string
  slug: string
  symbol: string
  direction: 'long' | 'short'
  thesis?: string
  tags: string[]
  entryTime: Date
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
  conviction?: number
  riskPct?: number
  status: 'open' | 'closed'
  exitTime?: Date
  exitPrice?: number
  notes?: string
  rMultiple?: number
  pnl?: number
  createdAt: Date
  updatedAt: Date
}

interface TradeDetailProps {
  trade: Trade
  onBack?: () => void
}

export function TradeDetail({ trade, onBack }: TradeDetailProps) {
  const getDirectionIcon = (direction: 'long' | 'short') => {
    return direction === 'long' ? (
      <TrendingUp className="h-5 w-5 text-green-600" />
    ) : (
      <TrendingDown className="h-5 w-5 text-red-600" />
    )
  }

  const getDirectionColor = (direction: 'long' | 'short') => {
    return direction === 'long' ? 'text-green-600' : 'text-red-600'
  }

  const getStatusColor = (status: 'open' | 'closed') => {
    return status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
  }

  const getConvictionStars = (conviction?: number) => {
    if (!conviction) return '—'
    return '★'.repeat(conviction) + '☆'.repeat(5 - conviction)
  }

  const calculateHoldTime = () => {
    if (!trade.exitTime) return null
    const diffMs = trade.exitTime.getTime() - trade.entryTime.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculateRiskReward = () => {
    if (!trade.stopLoss || !trade.takeProfit) return null
    
    const entry = trade.entryPrice
    const stop = trade.stopLoss
    const target = trade.takeProfit
    
    if (trade.direction === 'long') {
      const risk = entry - stop
      const reward = target - entry
      return risk > 0 ? reward / risk : null
    } else {
      const risk = stop - entry
      const reward = entry - target
      return risk > 0 ? reward / risk : null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {trade.symbol} {trade.direction.toUpperCase()}
            </h1>
            <p className="text-slate-600">
              {formatDate(trade.entryTime, 'long')}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(trade.status)}>
          {trade.status}
        </Badge>
      </div>

      {/* Trade Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getDirectionIcon(trade.direction)}
            Trade Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Entry Details */}
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">Entry Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Price:</span>
                  <span className="font-medium">{formatCurrency(trade.entryPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Time:</span>
                  <span className="font-medium">{formatDate(trade.entryTime, 'short')}</span>
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">Risk Management</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Stop Loss:</span>
                  <span className="font-medium text-red-600">
                    {trade.stopLoss ? formatCurrency(trade.stopLoss) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Take Profit:</span>
                  <span className="font-medium text-green-600">
                    {trade.takeProfit ? formatCurrency(trade.takeProfit) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Risk %:</span>
                  <span className="font-medium">
                    {trade.riskPct ? formatPercentage(trade.riskPct / 100) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">Performance</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">R-Multiple:</span>
                  <span className={`font-medium ${trade.rMultiple !== undefined ? (trade.rMultiple > 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-600'}`}>
                    {trade.rMultiple !== undefined ? formatNumber(trade.rMultiple, 2) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">P&L:</span>
                  <span className={`font-medium ${trade.pnl !== undefined ? (trade.pnl > 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-600'}`}>
                    {trade.pnl !== undefined ? formatCurrency(trade.pnl) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Hold Time:</span>
                  <span className="font-medium">
                    {calculateHoldTime() ? `${calculateHoldTime()} days` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trade Info */}
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">Trade Info</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Conviction:</span>
                  <span className="font-medium">{getConvictionStars(trade.conviction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Risk/Reward:</span>
                  <span className="font-medium">
                    {calculateRiskReward() ? formatNumber(calculateRiskReward()!, 2) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Created:</span>
                  <span className="font-medium">{formatDate(trade.createdAt, 'short')}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exit Details (if closed) */}
      {trade.status === 'closed' && trade.exitTime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Exit Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium text-slate-700">Exit Information</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Exit Price:</span>
                    <span className="font-medium">{formatCurrency(trade.exitPrice!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Exit Time:</span>
                    <span className="font-medium">{formatDate(trade.exitTime, 'short')}</span>
                  </div>
                </div>
              </div>
              {trade.notes && (
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-700">Exit Notes</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                    {trade.notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thesis */}
      {trade.thesis && (
        <Card>
          <CardHeader>
            <CardTitle>Trade Thesis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <div dangerouslySetInnerHTML={{ __html: trade.thesis || '' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {trade.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trade.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Trade Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-slate-900">Trade Opened</p>
                <p className="text-sm text-slate-600">
                  {formatDate(trade.entryTime, 'long')} - {trade.symbol} {trade.direction} at {formatCurrency(trade.entryPrice)}
                </p>
              </div>
            </div>
            {trade.status === 'closed' && trade.exitTime && (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-slate-900">Trade Closed</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(trade.exitTime, 'long')} - Exited at {formatCurrency(trade.exitPrice!)}
                    {trade.rMultiple !== undefined && (
                      <span className={`ml-2 ${trade.rMultiple > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({formatNumber(trade.rMultiple, 2)}R)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
