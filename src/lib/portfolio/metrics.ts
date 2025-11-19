/**
 * Portfolio metrics calculation functions
 * Calculates real-time portfolio performance from SignalTrade data
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@/lib/num'
import { 
  buildEquityCurve, 
  calculatePerformanceStats,
  filterTradesByScope,
  PerformanceScope
} from '@/lib/perf'

export interface PortfolioMetrics {
  totalReturn: number // Percentage
  ytdReturn: number // Year-to-date return
  mtdReturn: number // Month-to-date return
  winRate: number // Percentage
  profitFactor: number
  maxDrawdown: number // Percentage
  totalTrades: number
  openTrades: number
  closedTrades: number
  totalPnL: Decimal // Total profit/loss
  currentEquity: Decimal // Current portfolio value
  baseCapital: Decimal // Starting capital
}

/**
 * Get portfolio settings (base capital, etc.)
 */
async function getPortfolioSettings() {
  const settings = await prisma.portfolioSetting.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  
  if (!settings) {
    // Return defaults if no settings found
    return {
      baseCapitalUsd: new Decimal('100000'),
      positionModel: 'risk_pct' as const,
      slippageBps: 0,
      feeBps: 5
    }
  }
  
  // Map database positionModel to PortfolioSettings format
  const positionModel: 'risk_pct' | 'fixed_fraction' = settings.positionModel === 'fixed-risk' || settings.positionModel === 'risk_pct' 
    ? 'risk_pct' 
    : 'fixed_fraction'
  
  return {
    baseCapitalUsd: new Decimal(settings.baseCapitalUsd.toString()),
    positionModel,
    slippageBps: settings.slippageBps || 0,
    feeBps: settings.feeBps || 0
  }
}

/**
 * Calculate comprehensive portfolio metrics
 */
export async function getPortfolioMetrics(scope: PerformanceScope = 'ALL'): Promise<PortfolioMetrics> {
  const settings = await getPortfolioSettings()
  
  // Import database filter function
  const { buildTradeScopeWhere } = await import('@/lib/perf/filter')
  
  // Build WHERE clause for scope filtering (filter in database, not in memory)
  const scopeWhere = buildTradeScopeWhere(scope)
  
  // Get filtered trades directly from database
  const filteredTrades = await prisma.signalTrade.findMany({
    where: scopeWhere,
    orderBy: { entryTime: 'asc' }
  })
  
  // Get all trades for YTD/MTD calculations
  // Limit to last 2 years OR 10,000 trades max for performance
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  
  const allTrades = await prisma.signalTrade.findMany({
    where: {
      entryTime: { gte: twoYearsAgo }
    },
    orderBy: { entryTime: 'asc' },
    take: 10000 // Safety limit - should cover 2+ years of daily trades
  })
  
  // Calculate equity curve
  const equitySeries = buildEquityCurve(filteredTrades as any, settings)
  
  // Calculate performance stats
  const stats = calculatePerformanceStats(filteredTrades as any, equitySeries, settings.baseCapitalUsd)
  
  // Calculate time-based returns
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const ytdTrades = filterTradesByScope(
    allTrades.filter(t => t.entryTime >= yearStart) as any,
    scope
  )
  const mtdTrades = filterTradesByScope(
    allTrades.filter(t => t.entryTime >= monthStart) as any,
    scope
  )
  
  const ytdEquity = buildEquityCurve(ytdTrades as any, settings)
  const mtdEquity = buildEquityCurve(mtdTrades as any, settings)
  
  const ytdReturn = ytdEquity.length > 0 && settings.baseCapitalUsd.gt(0)
    ? ytdEquity[ytdEquity.length - 1].equity
        .sub(settings.baseCapitalUsd)
        .div(settings.baseCapitalUsd)
        .mul(100)
        .toNumber()
    : 0
  
  const mtdReturn = mtdEquity.length > 0 && settings.baseCapitalUsd.gt(0)
    ? mtdEquity[mtdEquity.length - 1].equity
        .sub(settings.baseCapitalUsd)
        .div(settings.baseCapitalUsd)
        .mul(100)
        .toNumber()
    : 0
  
  // Get current equity
  const currentEquity = equitySeries.length > 0 
    ? equitySeries[equitySeries.length - 1].equity 
    : settings.baseCapitalUsd
  
  // Calculate total P&L
  const totalPnL = currentEquity.sub(settings.baseCapitalUsd)
  
  // Count trades
  const openTrades = filteredTrades.filter(t => t.status === 'open').length
  const closedTrades = filteredTrades.filter(t => t.status === 'closed').length
  
  return {
    totalReturn: stats.totalReturn.toNumber() * 100,
    ytdReturn,
    mtdReturn,
    winRate: stats.winRate.toNumber() * 100,
    profitFactor: stats.profitFactor.toNumber(),
    maxDrawdown: stats.maxDrawdown.toNumber() * 100,
    totalTrades: stats.totalTrades,
    openTrades,
    closedTrades,
    totalPnL,
    currentEquity,
    baseCapital: settings.baseCapitalUsd
  }
}

/**
 * Get open positions summary
 */
export async function getOpenPositions() {
  const openTrades = await prisma.signalTrade.findMany({
    where: { status: 'open' },
    orderBy: { entryTime: 'desc' }
  })
  
  return openTrades.map(trade => ({
    id: trade.id,
    slug: trade.slug,
    symbol: trade.symbol,
    direction: trade.direction as 'long' | 'short',
    entryTime: trade.entryTime,
    entryPrice: new Decimal(trade.entryPrice.toString()),
    stopLoss: trade.stopLoss ? new Decimal(trade.stopLoss.toString()) : null,
    takeProfit: trade.takeProfit ? new Decimal(trade.takeProfit.toString()) : null,
    conviction: trade.conviction,
    riskPct: trade.riskPct ? new Decimal(trade.riskPct.toString()) : null,
    tags: trade.tags ? JSON.parse(trade.tags) : [],
    thesis: trade.thesis
  }))
}

/**
 * Get closed trades with full details
 */
export async function getClosedTrades(limit?: number) {
  const closedTrades = await prisma.signalTrade.findMany({
    where: { status: 'closed' },
    orderBy: { exitTime: 'desc' },
    take: limit
  })
  
  return closedTrades.map(trade => {
    const entryPrice = new Decimal(trade.entryPrice.toString())
    const exitPrice = trade.exitPrice ? new Decimal(trade.exitPrice.toString()) : null
    const stopLoss = trade.stopLoss ? new Decimal(trade.stopLoss.toString()) : null
    
    // Calculate P&L
    let pnl = new Decimal(0)
    let rMultiple: number | null = null
    
    if (exitPrice && trade.exitTime) {
      if (trade.direction === 'long') {
        pnl = exitPrice.sub(entryPrice)
      } else {
        pnl = entryPrice.sub(exitPrice)
      }
      
      // Calculate R-multiple if stop loss exists
      if (stopLoss) {
        const risk = trade.direction === 'long'
          ? entryPrice.sub(stopLoss)
          : stopLoss.sub(entryPrice)
        
        if (!risk.isZero()) {
          rMultiple = pnl.div(risk).toNumber()
        }
      }
    }
    
    return {
      id: trade.id,
      slug: trade.slug,
      symbol: trade.symbol,
      direction: trade.direction as 'long' | 'short',
      entryTime: trade.entryTime,
      entryPrice,
      exitTime: trade.exitTime,
      exitPrice,
      stopLoss,
      takeProfit: trade.takeProfit ? new Decimal(trade.takeProfit.toString()) : null,
      pnl: pnl.toNumber(),
      rMultiple,
      conviction: trade.conviction,
      riskPct: trade.riskPct ? new Decimal(trade.riskPct.toString()).toNumber() : null,
      tags: trade.tags ? JSON.parse(trade.tags) : [],
      notes: trade.notes
    }
  })
}

