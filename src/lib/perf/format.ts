/**
 * Formatting utilities for numbers, percentages, and currency
 * Handles both Decimal and number inputs
 */

import { Decimal, D, toNum } from '@/lib/num'

/**
 * Format currency value
 */
export function formatCurrency(value: Decimal | number, places: number = 2): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: places,
    maximumFractionDigits: places
  }).format(numValue)
}

/**
 * Format percentage value
 */
export function formatPercentage(value: Decimal | number, places: number = 2): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: places,
    maximumFractionDigits: places
  }).format(numValue / 100)
}

/**
 * Format number with commas
 */
export function formatNumber(value: Decimal | number, places: number = 2): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places
  }).format(numValue)
}

/**
 * Format number as integer
 */
export function formatInteger(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return new Intl.NumberFormat('en-US').format(Math.round(numValue))
}

/**
 * Format date
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'full' = 'short'): string {
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  }
  
  const options = formatOptions[format]

  return new Intl.DateTimeFormat('en-US', options).format(date)
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else {
    return 'Just now'
  }
}

/**
 * Format large numbers with suffixes (K, M, B)
 */
export function formatLargeNumber(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  const absValue = Math.abs(numValue)

  if (absValue >= 1e9) {
    return (numValue / 1e9).toFixed(1) + 'B'
  } else if (absValue >= 1e6) {
    return (numValue / 1e6).toFixed(1) + 'M'
  } else if (absValue >= 1e3) {
    return (numValue / 1e3).toFixed(1) + 'K'
  } else {
    return numValue.toFixed(2)
  }
}

/**
 * Format R-multiple with appropriate precision
 */
export function formatRMultiple(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  
  if (Math.abs(numValue) >= 10) {
    return numValue.toFixed(1) + 'R'
  } else if (Math.abs(numValue) >= 1) {
    return numValue.toFixed(2) + 'R'
  } else {
    return numValue.toFixed(3) + 'R'
  }
}

/**
 * Format percentage change with color indication
 */
export function formatPercentageChange(value: Decimal | number): {
  text: string
  isPositive: boolean
  isNegative: boolean
} {
  const numValue = typeof value === 'number' ? value : toNum(value)
  const text = formatPercentage(value, 2)
  
  return {
    text,
    isPositive: numValue > 0,
    isNegative: numValue < 0
  }
}

/**
 * Format trade duration
 */
export function formatDuration(days: number): string {
  if (days < 1) {
    return '< 1 day'
  } else if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'}`
  } else if (days < 30) {
    const weeks = Math.floor(days / 7)
    const remainingDays = days % 7
    if (remainingDays === 0) {
      return `${weeks} week${weeks === 1 ? '' : 's'}`
    } else {
      return `${weeks} week${weeks === 1 ? '' : 's'} ${remainingDays} day${remainingDays === 1 ? '' : 's'}`
    }
  } else if (days < 365) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    if (remainingDays === 0) {
      return `${months} month${months === 1 ? '' : 's'}`
    } else {
      return `${months} month${months === 1 ? '' : 's'} ${remainingDays} day${remainingDays === 1 ? '' : 's'}`
    }
  } else {
    const years = Math.floor(days / 365)
    const remainingDays = days % 365
    if (remainingDays === 0) {
      return `${years} year${years === 1 ? '' : 's'}`
    } else {
      return `${years} year${years === 1 ? '' : 's'} ${remainingDays} day${remainingDays === 1 ? '' : 's'}`
    }
  }
}

/**
 * Format profit/loss with color indication
 */
export function formatPnL(value: Decimal | number): {
  text: string
  isPositive: boolean
  isNegative: boolean
  isZero: boolean
} {
  const numValue = typeof value === 'number' ? value : toNum(value)
  const text = formatCurrency(value, 2)
  
  return {
    text,
    isPositive: numValue > 0,
    isNegative: numValue < 0,
    isZero: numValue === 0
  }
}

/**
 * Format basis points
 */
export function formatBasisPoints(value: number): string {
  return `${value} bps`
}

/**
 * Format conviction level as stars
 */
export function formatConviction(conviction?: number): string {
  if (!conviction || conviction < 1 || conviction > 5) {
    return '—'
  }
  
  return '★'.repeat(conviction) + '☆'.repeat(5 - conviction)
}

/**
 * Format max drawdown as percentage
 */
export function formatMaxDrawdown(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return formatPercentage(Math.abs(numValue), 2)
}

/**
 * Format win rate as percentage
 */
export function formatWinRate(value: Decimal | number): string {
  return formatPercentage(value, 1)
}

/**
 * Format profit factor
 */
export function formatProfitFactor(value: Decimal | number): string {
  if (value == null) {
    return '0.00'
  }
  try {
    let numValue: number
    if (typeof value === 'number') {
      numValue = value
    } else if (value && typeof value === 'object' && 'toNumber' in value) {
      numValue = (value as any).toNumber()
    } else if (value && typeof value === 'object' && 'toSignificantDigits' in value) {
      numValue = toNum(value as Decimal)
    } else {
      numValue = Number(value)
    }
    return numValue.toFixed(2)
  } catch (error) {
    console.error('Error formatting profit factor:', error, value)
    return '0.00'
  }
}

/**
 * Format Sharpe ratio
 */
export function formatSharpeRatio(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return numValue.toFixed(2)
}

/**
 * Format Calmar ratio
 */
export function formatCalmarRatio(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  return numValue.toFixed(2)
}

/**
 * Format trade count
 */
export function formatTradeCount(value: number): string {
  return formatInteger(value)
}

/**
 * Get color class for return values
 */
export function getReturnColorClass(value: Decimal | number): string {
  const numValue = typeof value === 'number' ? value : toNum(value)
  if (numValue > 0) return 'text-green-600'
  if (numValue < 0) return 'text-red-600'
  return 'text-slate-600'
}