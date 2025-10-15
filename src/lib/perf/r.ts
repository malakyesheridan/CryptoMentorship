/**
 * R-multiple calculations for risk management
 * Uses Decimal arithmetic for precision
 */

import { Decimal, D, safeDiv } from '@/lib/num'

export interface Trade {
  entryPrice: Decimal
  exitPrice: Decimal
  stopLoss?: Decimal
  riskPct?: Decimal
  direction: 'long' | 'short'
}

/**
 * Calculate R-multiple for a trade
 * R = (Exit Price - Entry Price) / (Entry Price - Stop Loss) * Direction Multiplier
 */
export function calculateRMultiple(trade: Trade): Decimal {
  const { entryPrice, exitPrice, stopLoss, riskPct, direction } = trade

  // Calculate price movement
  const priceMovement = direction === 'long'
    ? exitPrice.sub(entryPrice)
    : entryPrice.sub(exitPrice)

  // Calculate risk per share
  let riskPerShare: Decimal

  if (stopLoss && !stopLoss.isZero()) {
    riskPerShare = direction === 'long'
      ? entryPrice.sub(stopLoss)
      : stopLoss.sub(entryPrice)
    
    if (riskPerShare.isZero()) {
      // Fall back to risk percentage calculation
      return calculateRMultipleFromRiskPct(trade)
    }
  } else {
    // No stop loss, use risk percentage
    return calculateRMultipleFromRiskPct(trade)
  }

  // Calculate R-multiple
  return safeDiv(priceMovement, riskPerShare)
}

/**
 * Calculate R-multiple using risk percentage when stop loss is not available
 */
function calculateRMultipleFromRiskPct(trade: Trade): Decimal {
  const { entryPrice, exitPrice, riskPct, direction } = trade
  
  // Calculate price movement
  const priceMovement = direction === 'long'
    ? exitPrice.sub(entryPrice)
    : entryPrice.sub(exitPrice)

  // Use risk percentage to determine virtual risk
  const riskPercentage = riskPct || D(1) // Default to 1% if not specified
  const virtualRisk = entryPrice.mul(riskPercentage).div(D(100))

  if (virtualRisk.isZero()) {
    return D(0)
  }

  return safeDiv(priceMovement, virtualRisk)
}

/**
 * Calculate R-multiple for multiple trades
 */
export function calculateRMultiples(trades: Trade[]): Decimal[] {
  return trades.map(calculateRMultiple)
}

/**
 * Calculate average R-multiple
 */
export function calculateAverageRMultiples(trades: Trade[]): Decimal {
  if (trades.length === 0) {
    return D(0)
  }

  const rMultiples = calculateRMultiples(trades)
  const sum = rMultiples.reduce((total, r) => total.add(r), D(0))
  
  return safeDiv(sum, D(trades.length))
}

/**
 * Calculate expectancy (expected R-multiple per trade)
 */
export function calculateExpectancy(trades: Trade[]): Decimal {
  if (trades.length === 0) {
    return D(0)
  }

  const rMultiples = calculateRMultiples(trades)
  const winningTrades = rMultiples.filter(r => r.gt(D(0)))
  const losingTrades = rMultiples.filter(r => r.lte(D(0)))

  const winRate = safeDiv(D(winningTrades.length), D(trades.length))
  const lossRate = D(1).sub(winRate)

  const avgWin = winningTrades.length > 0
    ? safeDiv(
        winningTrades.reduce((sum, r) => sum.add(r), D(0)),
        D(winningTrades.length)
      )
    : D(0)

  const avgLoss = losingTrades.length > 0
    ? safeDiv(
        losingTrades.reduce((sum, r) => sum.add(r), D(0)),
        D(losingTrades.length)
      )
    : D(0)

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  return winRate.mul(avgWin).sub(lossRate.mul(avgLoss.abs()))
}

/**
 * Calculate risk-reward ratio
 */
export function calculateRiskRewardRatio(trade: Trade): Decimal {
  const { entryPrice, stopLoss, direction } = trade

  if (!stopLoss || stopLoss.isZero()) {
    return D(0)
  }

  // Calculate risk per share
  const riskPerShare = direction === 'long'
    ? entryPrice.sub(stopLoss)
    : stopLoss.sub(entryPrice)

  if (riskPerShare.isZero()) {
    return D(0)
  }

  // For risk-reward, we need to know the target (take profit)
  // This is a simplified version - in practice, you'd need takeProfit field
  return D(0) // Placeholder - would need takeProfit to calculate properly
}

/**
 * Validate R-multiple calculation
 */
export function validateRMultiple(trade: Trade): {
  isValid: boolean
  error?: string
} {
  if (trade.entryPrice.isZero()) {
    return { isValid: false, error: 'Entry price cannot be zero' }
  }

  if (trade.exitPrice.isZero()) {
    return { isValid: false, error: 'Exit price cannot be zero' }
  }

  if (trade.stopLoss && trade.stopLoss.isZero()) {
    return { isValid: false, error: 'Stop loss cannot be zero' }
  }

  if (trade.direction === 'long' && trade.stopLoss && trade.stopLoss.gte(trade.entryPrice)) {
    return { isValid: false, error: 'Stop loss must be below entry price for long trades' }
  }

  if (trade.direction === 'short' && trade.stopLoss && trade.stopLoss.lte(trade.entryPrice)) {
    return { isValid: false, error: 'Stop loss must be above entry price for short trades' }
  }

  return { isValid: true }
}