/**
 * Performance statistics computation
 * Calculates KPIs like total return, max drawdown, win rate, profit factor, etc.
 * Uses Decimal arithmetic for precision
 */

import { Decimal, D, toNum, safeDiv } from '@/lib/num'
import { EquityPoint } from './equity'

export interface PerformanceStats {
  totalReturn: Decimal
  maxDrawdown: Decimal
  winRate: Decimal
  profitFactor: Decimal
  avgRMultiple: Decimal
  expectancy: Decimal
  totalTrades: number
  avgHoldDays: number
  sharpeRatio?: Decimal
  calmarRatio?: Decimal
}

export interface TradeStats {
  grossProfit: Decimal
  grossLoss: Decimal
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: Decimal
  avgLoss: Decimal
  largestWin: Decimal
  largestLoss: Decimal
  avgHoldDays: number
  rMultiples: Decimal[]
}

/**
 * Calculate trade statistics from equity curve and trades
 */
export function calculateTradeStats(
  trades: Array<{
    entryTime: Date
    exitTime?: Date
    status: 'open' | 'closed'
    direction: 'long' | 'short'
    entryPrice: Decimal
    exitPrice?: Decimal
    stopLoss?: Decimal
    riskPct?: Decimal
  }>,
  equityPoints: EquityPoint[]
): TradeStats {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitTime && t.exitPrice)
  
  let grossProfit = D(0)
  let grossLoss = D(0)
  let winningTrades = 0
  let losingTrades = 0
  let totalHoldDays = 0
  const rMultiples: Decimal[] = []
  let largestWin = D(0)
  let largestLoss = D(0)

  for (const trade of closedTrades) {
    // Calculate PnL (simplified - would use actual position sizing in real implementation)
    const pnl = trade.direction === 'long' 
      ? trade.exitPrice!.sub(trade.entryPrice)
      : trade.entryPrice.sub(trade.exitPrice!)

    if (pnl.gt(D(0))) {
      grossProfit = grossProfit.add(pnl)
      winningTrades++
      if (pnl.gt(largestWin)) {
        largestWin = pnl
      }
    } else {
      grossLoss = grossLoss.add(pnl.abs())
      losingTrades++
      if (pnl.abs().gt(largestLoss)) {
        largestLoss = pnl.abs()
      }
    }

    // Calculate R-multiple
    if (trade.stopLoss) {
      const risk = trade.direction === 'long'
        ? trade.entryPrice.sub(trade.stopLoss)
        : trade.stopLoss.sub(trade.entryPrice)
      
      if (!risk.isZero()) {
        const rMultiple = safeDiv(pnl, risk.abs())
        rMultiples.push(rMultiple)
      }
    }

    // Calculate hold days
    const holdDays = Math.ceil(
      (trade.exitTime!.getTime() - trade.entryTime.getTime()) / (1000 * 60 * 60 * 24)
    )
    totalHoldDays += holdDays
  }

  const totalTrades = closedTrades.length
  const avgWin = winningTrades > 0 ? safeDiv(grossProfit, D(winningTrades)) : D(0)
  const avgLoss = losingTrades > 0 ? safeDiv(grossLoss, D(losingTrades)) : D(0)
  const avgHoldDays = totalTrades > 0 ? totalHoldDays / totalTrades : 0

  return {
    grossProfit,
    grossLoss,
    totalTrades,
    winningTrades,
    losingTrades,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgHoldDays,
    rMultiples
  }
}

/**
 * Calculate performance statistics
 */
export function calculatePerformanceStats(
  trades: Array<{
    entryTime: Date
    exitTime?: Date
    status: 'open' | 'closed'
    direction: 'long' | 'short'
    entryPrice: Decimal
    exitPrice?: Decimal
    stopLoss?: Decimal
    riskPct?: Decimal
  }>,
  equityPoints: EquityPoint[],
  baseCapital: Decimal
): PerformanceStats {
  const tradeStats = calculateTradeStats(trades, equityPoints)
  
  // Total return
  const finalEquity = equityPoints.length > 0 ? equityPoints[equityPoints.length - 1].equity : baseCapital
  const totalReturn = safeDiv(finalEquity.sub(baseCapital), baseCapital)

  // Max drawdown
  const maxDrawdown = equityPoints.length > 0 
    ? equityPoints.reduce((max, point) => point.drawdown.gt(max) ? point.drawdown : max, D(0))
    : D(0)

  // Win rate
  const winRate = tradeStats.totalTrades > 0 
    ? safeDiv(D(tradeStats.winningTrades), D(tradeStats.totalTrades))
    : D(0)

  // Profit factor
  const profitFactor = tradeStats.grossLoss.isZero()
    ? tradeStats.grossProfit.isZero() ? D(0) : D(Infinity)
    : safeDiv(tradeStats.grossProfit, tradeStats.grossLoss)

  // Average R-multiple and expectancy
  const avgRMultiple = tradeStats.rMultiples.length > 0
    ? safeDiv(
        tradeStats.rMultiples.reduce((sum, r) => sum.add(r), D(0)),
        D(tradeStats.rMultiples.length)
      )
    : D(0)

  const expectancy = avgRMultiple

  // Sharpe ratio (simplified - would need risk-free rate)
  const sharpeRatio = calculateSharpeRatio(equityPoints)

  // Calmar ratio
  const calmarRatio = maxDrawdown.isZero() ? D(0) : safeDiv(totalReturn, maxDrawdown)

  return {
    totalReturn,
    maxDrawdown,
    winRate,
    profitFactor,
    avgRMultiple,
    expectancy,
    totalTrades: tradeStats.totalTrades,
    avgHoldDays: tradeStats.avgHoldDays,
    sharpeRatio,
    calmarRatio
  }
}

/**
 * Calculate Sharpe ratio (simplified version)
 */
function calculateSharpeRatio(equityPoints: EquityPoint[]): Decimal {
  if (equityPoints.length < 2) return D(0)

  // Calculate daily returns
  const returns: Decimal[] = []
  for (let i = 1; i < equityPoints.length; i++) {
    const prevEquity = equityPoints[i - 1].equity
    const currentEquity = equityPoints[i].equity
    const dailyReturn = safeDiv(currentEquity.sub(prevEquity), prevEquity)
    returns.push(dailyReturn)
  }

  if (returns.length === 0) return D(0)

  // Calculate mean and standard deviation
  const meanReturn = safeDiv(
    returns.reduce((sum, r) => sum.add(r), D(0)),
    D(returns.length)
  )
  
  const variance = safeDiv(
    returns.reduce((sum, r) => sum.add(r.sub(meanReturn).pow(2)), D(0)),
    D(returns.length)
  )
  
  const stdDev = variance.sqrt()

  // Assume risk-free rate of 0 for simplicity
  const riskFreeRate = D(0)
  const excessReturn = meanReturn.sub(riskFreeRate)

  return stdDev.isZero() ? D(0) : safeDiv(excessReturn, stdDev)
}

/**
 * Calculate time-range specific statistics
 */
export function calculateTimeRangeStats(
  trades: Array<{
    entryTime: Date
    exitTime?: Date
    status: 'open' | 'closed'
    direction: 'long' | 'short'
    entryPrice: Decimal
    exitPrice?: Decimal
    stopLoss?: Decimal
    riskPct?: Decimal
  }>,
  equityPoints: EquityPoint[],
  baseCapital: Decimal,
  timeRange: 'ytd' | '1y' | '90d' | 'all'
): PerformanceStats {
  const now = new Date()
  let startDate: Date

  switch (timeRange) {
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'all':
    default:
      startDate = new Date(0)
      break
  }

  // Filter trades and equity points by time range
  const filteredTrades = trades.filter(trade => trade.entryTime >= startDate)
  const filteredEquityPoints = equityPoints.filter(point => point.date >= startDate)

  // Adjust base capital to the equity at start of period
  const adjustedBaseCapital = filteredEquityPoints.length > 0 
    ? filteredEquityPoints[0].equity 
    : baseCapital

  return calculatePerformanceStats(filteredTrades, filteredEquityPoints, adjustedBaseCapital)
}

/**
 * Convert PerformanceStats to number format for UI components
 */
export function statsToNumber(stats: PerformanceStats): {
  totalReturn: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  avgRMultiple: number
  expectancy: number
  totalTrades: number
  avgHoldDays: number
  sharpeRatio?: number
  calmarRatio?: number
} {
  return {
    totalReturn: toNum(stats.totalReturn),
    maxDrawdown: toNum(stats.maxDrawdown),
    winRate: toNum(stats.winRate),
    profitFactor: toNum(stats.profitFactor),
    avgRMultiple: toNum(stats.avgRMultiple),
    expectancy: toNum(stats.expectancy),
    totalTrades: stats.totalTrades,
    avgHoldDays: stats.avgHoldDays,
    sharpeRatio: stats.sharpeRatio ? toNum(stats.sharpeRatio) : undefined,
    calmarRatio: stats.calmarRatio ? toNum(stats.calmarRatio) : undefined
  }
}