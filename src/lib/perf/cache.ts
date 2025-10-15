import crypto from 'crypto';
import { Decimal } from '../num';
import { SignalTrade, PortfolioSettings, PerformanceStats, EquityPoint, MonthlyReturn } from './index';

export interface PerfSnapshot {
  id: string;
  scope: string;
  hash: string;
  payload: string; // JSON string of precomputed data
  createdAt: Date;
}

export interface CachedPerformanceData {
  stats: PerformanceStats;
  equitySeries: EquityPoint[];
  drawdownSeries: EquityPoint[];
  monthlyReturns: MonthlyReturn[];
  tradeStats: {
    totalTrades: number;
    closedTrades: number;
    openTrades: number;
    avgHoldDays: number;
  };
}

export type PerformanceScope = 'ALL' | 'YTD' | '1Y' | '90D' | string;

/**
 * Compute a stable hash for trades and settings to use as cache key
 */
export function computeHash(trades: SignalTrade[], settings: PortfolioSettings): string {
  // Create a stable representation of the data
  const data = {
    trades: trades.map(trade => ({
      id: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      entryTime: trade.entryTime.toISOString(),
      entryPrice: trade.entryPrice.toString(),
      stopLoss: trade.stopLoss?.toString() || null,
      takeProfit: trade.takeProfit?.toString() || null,
      exitTime: trade.exitTime?.toISOString() || null,
      exitPrice: trade.exitPrice?.toString() || null,
      conviction: trade.conviction,
      riskPct: trade.riskPct?.toString() || null,
      tags: trade.tags,
      status: trade.status,
      createdAt: trade.entryTime.toISOString(),
      updatedAt: trade.exitTime?.toISOString() || trade.entryTime.toISOString(),
    })),
    settings: {
      baseCapitalUsd: settings.baseCapitalUsd.toString(),
      positionModel: settings.positionModel,
      feeBps: settings.feeBps,
      slippageBps: settings.slippageBps,
    }
  };

  // Create deterministic JSON string
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  
  // Generate SHA256 hash
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Filter trades by time scope
 */
export function filterTradesByScope(trades: SignalTrade[], scope: PerformanceScope): SignalTrade[] {
  const now = new Date();
  let startDate: Date;

  switch (scope) {
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case '1Y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case '90D':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'ALL':
      return trades;
    default:
      // Assume it's a date range string like "2024-01-01_2024-12-31"
      const [startStr, endStr] = scope.split('_');
      if (startStr && endStr) {
        startDate = new Date(startStr);
        const endDate = new Date(endStr);
        return trades.filter(trade => 
          trade.entryTime >= startDate && trade.entryTime <= endDate
        );
      }
      return trades;
  }

  return trades.filter(trade => trade.entryTime >= startDate);
}

/**
 * Serialize performance data for caching
 */
export function serializePerformanceData(data: CachedPerformanceData): string {
  // Convert Decimal values to strings for JSON serialization
  const serialized = {
    stats: {
      ...data.stats,
      totalReturn: data.stats.totalReturn.toString(),
      maxDrawdown: data.stats.maxDrawdown.toString(),
      winRate: data.stats.winRate.toString(),
      profitFactor: data.stats.profitFactor.toString(),
      avgRMultiple: data.stats.avgRMultiple.toString(),
      expectancy: data.stats.expectancy.toString(),
      sharpeRatio: data.stats.sharpeRatio?.toString() || null,
      calmarRatio: data.stats.calmarRatio?.toString() || null,
    },
    equitySeries: data.equitySeries.map(point => ({
      date: point.date.toISOString(),
      equity: point.equity.toString(),
      drawdown: point.drawdown.toString(),
    })),
    drawdownSeries: data.drawdownSeries.map(point => ({
      date: point.date.toISOString(),
      equity: point.equity.toString(),
      drawdown: point.drawdown.toString(),
    })),
    monthlyReturns: data.monthlyReturns.map(cell => ({
      year: cell.year,
      month: cell.month,
      return: cell.return.toString(),
    })),
    tradeStats: data.tradeStats,
  };

  return JSON.stringify(serialized);
}

/**
 * Deserialize performance data from cache
 */
export function deserializePerformanceData(jsonString: string): CachedPerformanceData {
  const parsed = JSON.parse(jsonString);
  
  return {
    stats: {
      ...parsed.stats,
      totalReturn: new Decimal(parsed.stats.totalReturn),
      maxDrawdown: new Decimal(parsed.stats.maxDrawdown),
      winRate: new Decimal(parsed.stats.winRate),
      profitFactor: new Decimal(parsed.stats.profitFactor),
      avgRMultiple: new Decimal(parsed.stats.avgRMultiple),
      expectancy: new Decimal(parsed.stats.expectancy),
      sharpeRatio: new Decimal(parsed.stats.sharpeRatio),
      calmarRatio: new Decimal(parsed.stats.calmarRatio),
    },
    equitySeries: parsed.equitySeries.map((point: any) => ({
      date: new Date(point.date),
      equity: new Decimal(point.equity),
      drawdown: new Decimal(point.drawdown),
    })),
    drawdownSeries: parsed.drawdownSeries.map((point: any) => ({
      date: new Date(point.date),
      equity: new Decimal(point.equity),
      drawdown: new Decimal(point.drawdown),
    })),
    monthlyReturns: parsed.monthlyReturns.map((cell: any) => ({
      year: cell.year,
      month: cell.month,
      return: new Decimal(cell.return),
    })),
    tradeStats: parsed.tradeStats,
  };
}

/**
 * Generate scope key for date ranges
 */
export function generateScopeKey(startDate?: Date, endDate?: Date): PerformanceScope {
  if (startDate && endDate) {
    return `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
  }
  return 'ALL';
}

/**
 * Check if cache entry is still valid (not expired)
 */
export function isCacheValid(createdAt: Date, maxAgeHours: number = 24): boolean {
  const now = new Date();
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return ageHours < maxAgeHours;
}
