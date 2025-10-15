/**
 * Monthly returns heatmap calculations
 * Uses Decimal arithmetic for precision
 */

import { Decimal, D, safeDiv } from '@/lib/num'
import { EquityPoint } from './equity'

export interface MonthlyReturn {
  year: number
  month: number
  return: Decimal
}

/**
 * Calculate monthly returns from equity curve
 */
export function calculateMonthlyReturns(equityPoints: EquityPoint[]): MonthlyReturn[] {
  if (equityPoints.length === 0) {
    return []
  }

  const monthlyReturns: MonthlyReturn[] = []
  const monthlyData = new Map<string, { startEquity: Decimal; endEquity: Decimal }>()

  // Group equity points by month
  for (const point of equityPoints) {
    const year = point.date.getFullYear()
    const month = point.date.getMonth() + 1 // JavaScript months are 0-indexed
    const key = `${year}-${month}`

    if (!monthlyData.has(key)) {
      monthlyData.set(key, {
        startEquity: point.equity,
        endEquity: point.equity
      })
    } else {
      const data = monthlyData.get(key)!
      data.endEquity = point.equity
    }
  }

  // Calculate returns for each month
  for (const [key, data] of Array.from(monthlyData)) {
    const [yearStr, monthStr] = key.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)

    if (data.startEquity.isZero()) {
      monthlyReturns.push({
        year,
        month,
        return: D(0)
      })
    } else {
      const monthlyReturn = safeDiv(
        data.endEquity.sub(data.startEquity),
        data.startEquity
      )
      
      monthlyReturns.push({
        year,
        month,
        return: monthlyReturn
      })
    }
  }

  // Sort by year and month
  return monthlyReturns.sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year
    }
    return a.month - b.month
  })
}

/**
 * Calculate returns for a specific time range
 */
export function calculateTimeRangeReturns(
  equityPoints: EquityPoint[],
  startDate: Date,
  endDate: Date
): Decimal {
  const filteredPoints = equityPoints.filter(point => 
    point.date >= startDate && point.date <= endDate
  )

  if (filteredPoints.length === 0) {
    return D(0)
  }

  const startEquity = filteredPoints[0].equity
  const endEquity = filteredPoints[filteredPoints.length - 1].equity

  if (startEquity.isZero()) {
    return D(0)
  }

  return safeDiv(endEquity.sub(startEquity), startEquity)
}

/**
 * Calculate year-to-date returns
 */
export function calculateYTDReturns(equityPoints: EquityPoint[]): Decimal {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  
  return calculateTimeRangeReturns(equityPoints, startOfYear, now)
}

/**
 * Calculate returns for the last N days
 */
export function calculateLastNDaysReturns(equityPoints: EquityPoint[], days: number): Decimal {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  return calculateTimeRangeReturns(equityPoints, startDate, now)
}

/**
 * Calculate returns for the last N months
 */
export function calculateLastNMonthsReturns(equityPoints: EquityPoint[], months: number): Decimal {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  
  return calculateTimeRangeReturns(equityPoints, startDate, now)
}

/**
 * Calculate returns for the last N years
 */
export function calculateLastNYearsReturns(equityPoints: EquityPoint[], years: number): Decimal {
  const now = new Date()
  const startDate = new Date(now.getFullYear() - years, now.getMonth(), now.getDate())
  
  return calculateTimeRangeReturns(equityPoints, startDate, now)
}

/**
 * Get the best and worst performing months
 */
export function getBestWorstMonths(monthlyReturns: MonthlyReturn[]): {
  best: MonthlyReturn | null
  worst: MonthlyReturn | null
} {
  if (monthlyReturns.length === 0) {
    return { best: null, worst: null }
  }

  let best = monthlyReturns[0]
  let worst = monthlyReturns[0]

  for (const monthlyReturn of monthlyReturns) {
    if (monthlyReturn.return.gt(best.return)) {
      best = monthlyReturn
    }
    if (monthlyReturn.return.lt(worst.return)) {
      worst = monthlyReturn
    }
  }

  return { best, worst }
}

/**
 * Calculate monthly return statistics
 */
export function calculateMonthlyReturnStats(monthlyReturns: MonthlyReturn[]): {
  average: Decimal
  median: Decimal
  standardDeviation: Decimal
  positiveMonths: number
  negativeMonths: number
  totalMonths: number
} {
  if (monthlyReturns.length === 0) {
    return {
      average: D(0),
      median: D(0),
      standardDeviation: D(0),
      positiveMonths: 0,
      negativeMonths: 0,
      totalMonths: 0
    }
  }

  const returns = monthlyReturns.map(r => r.return)
  const sum = returns.reduce((total, r) => total.add(r), D(0))
  const average = safeDiv(sum, D(returns.length))

  // Calculate median
  const sortedReturns = [...returns].sort((a, b) => a.cmp(b))
  const median = sortedReturns.length % 2 === 0
    ? safeDiv(
        sortedReturns[sortedReturns.length / 2 - 1].add(sortedReturns[sortedReturns.length / 2]),
        D(2)
      )
    : sortedReturns[Math.floor(sortedReturns.length / 2)]

  // Calculate standard deviation
  const variance = safeDiv(
    returns.reduce((sum, r) => sum.add(r.sub(average).pow(2)), D(0)),
    D(returns.length)
  )
  const standardDeviation = variance.sqrt()

  // Count positive and negative months
  const positiveMonths = returns.filter(r => r.gt(D(0))).length
  const negativeMonths = returns.filter(r => r.lt(D(0))).length

  return {
    average,
    median,
    standardDeviation,
    positiveMonths,
    negativeMonths,
    totalMonths: returns.length
  }
}

/**
 * Convert MonthlyReturn to number format for UI components
 */
export function monthlyReturnToNumber(monthlyReturn: MonthlyReturn): {
  year: number
  month: number
  return: number
} {
  return {
    year: monthlyReturn.year,
    month: monthlyReturn.month,
    return: monthlyReturn.return.toNumber()
  }
}