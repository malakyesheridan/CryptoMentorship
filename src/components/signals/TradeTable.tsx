'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercentage, formatDate, formatNumber } from '@/lib/perf/format'
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

interface Trade {
  id: string
  slug: string
  symbol: string
  direction: 'long' | 'short'
  entryTime: Date
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
  status: 'open' | 'closed'
  exitTime?: Date | null
  exitPrice?: number
  rMultiple?: number | null
  pnl?: number
  tags: string[]
  conviction?: number
  riskPct?: number
}

interface TradeTableProps {
  trades: Trade[]
  title: string
  showFilters?: boolean
  compact?: boolean
}

export function TradeTable({ 
  trades, 
  title, 
  showFilters = true,
  compact = false
}: TradeTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [sortField, setSortField] = useState<keyof Trade>('entryTime')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    symbol: '',
    status: '',
    tags: '',
    dateFrom: '',
    dateTo: ''
  })

  // Internal handlers
  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export CSV')
  }

  const handleTradeClick = (trade: Trade) => {
    // TODO: Navigate to trade detail
    console.log('Trade clicked:', trade.slug)
  }

  // Filter trades
  const filteredTrades = trades.filter(trade => {
    if (filters.symbol && !trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
      return false
    }
    if (filters.status && trade.status !== filters.status) {
      return false
    }
    if (filters.tags && !trade.tags.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase()))) {
      return false
    }
    if (filters.dateFrom && trade.entryTime < new Date(filters.dateFrom)) {
      return false
    }
    if (filters.dateTo && trade.entryTime > new Date(filters.dateTo)) {
      return false
    }
    return true
  })

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === undefined || bValue === undefined) return 0
    
    let comparison = 0
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime()
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Paginate trades
  const totalPages = Math.ceil(sortedTrades.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTrades = sortedTrades.slice(startIndex, startIndex + pageSize)

  const handleSort = (field: keyof Trade) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: keyof Trade) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? '↑' : '↓'
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Filters */}
        {showFilters && (
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={filters.symbol}
                  onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="BTC, ETH..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={filters.tags}
                  onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="DeFi, Layer 2..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100`}
                  onClick={() => handleSort('symbol')}
                >
                  Symbol {getSortIcon('symbol')}
                </th>
                <th 
                  className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100`}
                  onClick={() => handleSort('direction')}
                >
                  Direction {getSortIcon('direction')}
                </th>
                <th 
                  className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100`}
                  onClick={() => handleSort('entryTime')}
                >
                  Entry {getSortIcon('entryTime')}
                </th>
                <th className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider`}>
                  Entry Price
                </th>
                {!compact && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    SL/TP
                  </th>
                )}
                {!compact && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Conviction
                  </th>
                )}
                {!compact && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Risk %
                  </th>
                )}
                <th 
                  className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100`}
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </th>
                {!compact && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Exit
                  </th>
                )}
                <th className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider`}>
                  R-Multiple
                </th>
                <th className={`${compact ? 'px-3 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 uppercase tracking-wider`}>
                  P&L
                </th>
                {!compact && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tags
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginatedTrades.map((trade) => (
                <tr 
                  key={trade.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleTradeClick(trade)}
                >
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm font-medium text-slate-900`}>
                    {trade.symbol}
                  </td>
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`}>
                    <span className={`font-medium ${getDirectionColor(trade.direction)}`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-slate-500`}>
                    {formatDate(trade.entryTime, 'short')}
                  </td>
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-slate-900`}>
                    {formatCurrency(trade.entryPrice)}
                  </td>
                  {!compact && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="space-y-1">
                        {trade.stopLoss && (
                          <div className="text-red-600">SL: {formatCurrency(trade.stopLoss)}</div>
                        )}
                        {trade.takeProfit && (
                          <div className="text-green-600">TP: {formatCurrency(trade.takeProfit)}</div>
                        )}
                        {!trade.stopLoss && !trade.takeProfit && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  )}
                  {!compact && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {getConvictionStars(trade.conviction)}
                    </td>
                  )}
                  {!compact && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {trade.riskPct ? formatPercentage(trade.riskPct / 100) : '—'}
                    </td>
                  )}
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap`}>
                    <Badge className={getStatusColor(trade.status)}>
                      {trade.status}
                    </Badge>
                  </td>
                  {!compact && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {trade.exitTime ? formatDate(trade.exitTime, 'short') : '—'}
                    </td>
                  )}
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`}>
                    {trade.rMultiple !== null && trade.rMultiple !== undefined ? (
                      <span className={trade.rMultiple > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatNumber(trade.rMultiple, 2)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm`}>
                    {trade.pnl !== undefined ? (
                      <span className={trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(trade.pnl)}
                      </span>
                    ) : '—'}
                  </td>
                  {!compact && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {trade.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {trade.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{trade.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedTrades.length)} of {sortedTrades.length} trades
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
