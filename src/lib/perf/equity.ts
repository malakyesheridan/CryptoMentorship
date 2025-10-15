/**
 * Equity curve computation from signal trades
 * Handles position sizing, fees, slippage, and portfolio allocation models
 * Uses Decimal arithmetic for precision
 */

import { Decimal, D, toNum, safeDiv, applyBasisPoints } from '@/lib/num'

export interface SignalTrade {
  id: string
  slug: string
  symbol: string
  market: string
  direction: 'long' | 'short'
  thesis?: string
  tags: string
  entryTime: Date
  entryPrice: Decimal
  stopLoss?: Decimal
  takeProfit?: Decimal
  conviction?: number
  riskPct?: Decimal
  status: 'open' | 'closed'
  exitTime?: Date
  exitPrice?: Decimal
  notes?: string
}

export interface PortfolioSettings {
  baseCapitalUsd: Decimal
  positionModel: 'risk_pct' | 'fixed_fraction'
  slippageBps: number
  feeBps: number
}

export interface EquityPoint {
  date: Date
  equity: Decimal
  drawdown: Decimal
  trades: number
}

export interface PositionSize {
  size: Decimal
  riskAmount: Decimal
}

/**
 * Calculate position size based on portfolio settings and trade parameters
 */
export function calculatePositionSize(
  trade: SignalTrade,
  settings: PortfolioSettings,
  currentEquity: Decimal
): PositionSize {
  const { positionModel } = settings
  
  if (positionModel === 'risk_pct' && trade.stopLoss && trade.riskPct) {
    // Risk-based position sizing
    const riskAmount = currentEquity.mul(trade.riskPct).div(D(100))
    const priceRisk = trade.direction === 'long'
      ? trade.entryPrice.sub(trade.stopLoss)
      : trade.stopLoss.sub(trade.entryPrice)
    
    const positionSize = safeDiv(riskAmount, priceRisk.abs())
    
    return {
      size: positionSize,
      riskAmount
    }
  } else {
    // Fixed fraction fallback (1% of equity)
    const fixedFraction = D(0.01)
    const positionSize = currentEquity.mul(fixedFraction).div(trade.entryPrice)
    
    return {
      size: positionSize,
      riskAmount: currentEquity.mul(fixedFraction)
    }
  }
}

/**
 * Calculate trade PnL with fees and slippage
 */
export function calculateTradePnL(
  trade: SignalTrade,
  positionSize: PositionSize,
  settings: PortfolioSettings
): Decimal {
  if (!trade.exitPrice || !trade.exitTime) {
    return D(0) // Open trade
  }

  const { slippageBps, feeBps } = settings

  // Calculate entry costs
  const entryValue = positionSize.size.mul(trade.entryPrice)
  const entryCosts = applyBasisPoints(entryValue, feeBps + slippageBps)
  
  // Calculate exit value and costs
  const exitValue = positionSize.size.mul(trade.exitPrice)
  const exitCosts = applyBasisPoints(exitValue, feeBps + slippageBps)

  // Calculate gross PnL
  let grossPnL: Decimal
  if (trade.direction === 'long') {
    grossPnL = exitValue.sub(entryValue)
  } else {
    grossPnL = entryValue.sub(exitValue)
  }

  // Apply total costs
  const totalCosts = entryCosts.add(exitCosts)
  
  return grossPnL.sub(totalCosts)
}

/**
 * Build equity curve from trades
 */
export function buildEquityCurve(
  trades: SignalTrade[],
  settings: PortfolioSettings,
  startDate?: Date,
  endDate?: Date
): EquityPoint[] {
  // Sort trades by entry time
  const sortedTrades = [...trades].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime())
  
  // Filter by date range if provided
  const filteredTrades = sortedTrades.filter(trade => {
    if (startDate && trade.entryTime < startDate) return false
    if (endDate && trade.entryTime > endDate) return false
    return true
  })

  if (filteredTrades.length === 0) {
    return []
  }

  const equityPoints: EquityPoint[] = []
  let currentEquity = settings.baseCapitalUsd
  let peakEquity = currentEquity
  let totalTrades = 0

  // Create daily equity points
  const startTime = startDate || filteredTrades[0].entryTime
  const endTime = endDate || new Date()
  
  for (let date = new Date(startTime); date <= endTime; date.setDate(date.getDate() + 1)) {
    const dayTrades = filteredTrades.filter(trade => {
      const tradeDate = new Date(trade.entryTime)
      tradeDate.setHours(0, 0, 0, 0)
      const currentDate = new Date(date)
      currentDate.setHours(0, 0, 0, 0)
      return tradeDate.getTime() === currentDate.getTime()
    })

    // Process trades for this day
    for (const trade of dayTrades) {
      if (trade.status === 'closed' && trade.exitTime && trade.exitPrice) {
        const positionSize = calculatePositionSize(trade, settings, currentEquity)
        const pnl = calculateTradePnL(trade, positionSize, settings)
        
        currentEquity = currentEquity.add(pnl)
        totalTrades++
        
        // Update peak equity for drawdown calculation
        if (currentEquity.gt(peakEquity)) {
          peakEquity = currentEquity
        }
      }
    }

    // Calculate drawdown
    const drawdown = safeDiv(peakEquity.sub(currentEquity), peakEquity)

    equityPoints.push({
      date: new Date(date),
      equity: currentEquity,
      drawdown: drawdown,
      trades: totalTrades
    })
  }

  return equityPoints
}

/**
 * Get current equity from trades (for open positions)
 */
export function getCurrentEquity(
  trades: SignalTrade[],
  settings: PortfolioSettings
): Decimal {
  const equityCurve = buildEquityCurve(trades, settings)
  return equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : settings.baseCapitalUsd
}

/**
 * Calculate unrealized PnL for open positions
 * Note: This is a simplified calculation without current market prices
 */
export function calculateUnrealizedPnL(
  openTrades: SignalTrade[],
  settings: PortfolioSettings,
  currentEquity: Decimal
): Decimal {
  let totalUnrealized = D(0)

  for (const trade of openTrades) {
    if (trade.status === 'open') {
      const positionSize = calculatePositionSize(trade, settings, currentEquity)
      // For now, assume no unrealized PnL without current prices
      // This would be enhanced with a price adapter later
      totalUnrealized = totalUnrealized.add(D(0))
    }
  }

  return totalUnrealized
}

/**
 * Convert EquityPoint to number format for UI components
 */
export function equityPointToNumber(point: EquityPoint): {
  date: Date
  equity: number
  drawdown: number
  trades: number
} {
  return {
    date: point.date,
    equity: toNum(point.equity),
    drawdown: toNum(point.drawdown),
    trades: point.trades
  }
}