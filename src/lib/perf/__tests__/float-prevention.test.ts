/// <reference path="../../../test/globals.d.ts" />
import { buildEquityCurve, type SignalTrade, calculatePerformanceStats, type PortfolioSettings } from '../index'
import { calculateRMultiple } from '@/lib/perf/r'
import { Decimal } from '@/lib/num/dec'

describe('Float Prevention Tests', () => {
  test('All performance calculations use Decimal', () => {
    const trades: SignalTrade[] = [
      {
        id: 'test-trade',
        slug: 'btc-test-trade',
        symbol: 'BTC',
        market: 'crypto:spot',
        direction: 'long',
        entryTime: new Date('2024-01-01T10:00:00Z'),
        entryPrice: new Decimal('40000'),
        stopLoss: new Decimal('38000'),
        takeProfit: new Decimal('42000'),
        exitTime: new Date('2024-01-05T14:00:00Z'),
        exitPrice: new Decimal('41800'),
        conviction: 4,
        riskPct: new Decimal('2'),
        tags: '["crypto", "btc"]',
        notes: 'Test trade',
        status: 'closed',
      }
    ];

    const settings: PortfolioSettings = {
      baseCapitalUsd: new Decimal('100000'),
      positionModel: 'risk_pct',
      feeBps: 10,
      slippageBps: 5,
    };

    // These should all work with Decimal
    const equitySeries = buildEquityCurve(trades, settings);
    const stats = calculatePerformanceStats(trades, equitySeries, settings.baseCapitalUsd);
    // TODO: Implement monthly returns aggregation function
    // const monthlyReturns = aggregateMonthlyReturns(equitySeries);
    const rMultiple = calculateRMultiple({
      entryPrice: new Decimal('40000'),
      exitPrice: new Decimal('41800'),
      stopLoss: new Decimal('38000'),
      direction: 'long'
    });

    // Verify all results are Decimal instances
    expect(stats.totalReturn).toBeInstanceOf(Decimal);
    expect(stats.maxDrawdown).toBeInstanceOf(Decimal);
    expect(stats.winRate).toBeInstanceOf(Decimal);
    expect(stats.profitFactor).toBeInstanceOf(Decimal);
    expect(rMultiple).toBeInstanceOf(Decimal);

    // Verify equity series uses Decimal
    equitySeries.forEach(point => {
      expect(point.equity).toBeInstanceOf(Decimal);
      expect(point.drawdown).toBeInstanceOf(Decimal);
    });

    // TODO: Implement monthly returns aggregation function
    // Verify monthly returns use Decimal
    // monthlyReturns.forEach(monthly => {
    //   expect(monthly.return).toBeInstanceOf(Decimal);
    // });
  });

  test('Decimal arithmetic operations work correctly', () => {
    const a = new Decimal('100.123456789');
    const b = new Decimal('50.987654321');
    
    const sum = a.add(b);
    const diff = a.sub(b);
    const product = a.mul(b);
    const quotient = a.div(b);
    
    expect(sum.toString()).toBe('151.11111111');
    expect(diff.toString()).toBe('49.135802468');
    expect(product.toString()).toBe('5112.34567890123456789');
    expect(quotient.toString()).toBe('1.96363636363636363636');
  });

  test('Decimal comparison operations work correctly', () => {
    const a = new Decimal('100.5');
    const b = new Decimal('100.0');
    
    expect(a.gt(b)).toBe(true);
    expect(a.gte(b)).toBe(true);
    expect(a.lt(b)).toBe(false);
    expect(a.lte(b)).toBe(false);
    expect(a.eq(b)).toBe(false);
  });

  test('Decimal precision is maintained through calculations', () => {
    // Test that precision is not lost in financial calculations
    const price = new Decimal('40000.123456789');
    const feeBps = 10; // 0.1%
    const fee = price.mul(feeBps).div(10000);
    
    // Fee should be calculated precisely
    expect(fee.toString()).toBe('4.0000123456789');
    
    // Test slippage calculation
    const slippageBps = 5; // 0.05%
    const slippage = price.mul(slippageBps).div(10000);
    expect(slippage.toString()).toBe('2.00000617283945');
  });
});
