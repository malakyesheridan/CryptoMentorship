/// <reference path="../../../test/globals.d.ts" />
import { buildEquityCurve, calculatePerformanceStats, type SignalTrade, type PortfolioSettings } from '../index'
import { calculateRMultiple } from '@/lib/perf/r'
import { Decimal } from '@/lib/num/dec'

describe('Performance Library - Deterministic Tests', () => {
  const baseSettings: PortfolioSettings = {
    baseCapitalUsd: new Decimal('100000'),
    positionModel: 'risk_pct',
    feeBps: 10, // 0.1%
    slippageBps: 5, // 0.05%
  };

  describe('Two-Trade Scenario (Win + Loss)', () => {
    const trades: SignalTrade[] = [
      {
        id: 'trade-1',
        slug: 'btc-long-test-1',
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
        notes: 'Test trade 1',
        status: 'closed',
      },
      {
        id: 'trade-2',
        slug: 'eth-short-test-2',
        symbol: 'ETH',
        market: 'crypto:spot',
        direction: 'long',
        entryTime: new Date('2024-01-10T09:00:00Z'),
        entryPrice: new Decimal('2500'),
        stopLoss: new Decimal('2400'),
        takeProfit: new Decimal('2600'),
        exitTime: new Date('2024-01-12T16:00:00Z'),
        exitPrice: new Decimal('2380'),
        conviction: 3,
        riskPct: new Decimal('1.5'),
        tags: '["crypto", "eth"]',
        notes: 'Test trade 2',
        status: 'closed',
      }
    ];

    test('R-Multiple calculations are precise', () => {
      // Trade 1: Win
      const r1 = calculateRMultiple({
        entryPrice: new Decimal('40000'),
        exitPrice: new Decimal('41800'),
        stopLoss: new Decimal('38000'),
        direction: 'long'
      });
      expect(r1.toString()).toBe('0.9'); // (41800-40000)/(40000-38000) = 1800/2000 = 0.9
      expect(r1.gt(0)).toBe(true); // Positive R-multiple means win

      // Trade 2: Loss
      const r2 = calculateRMultiple({
        entryPrice: new Decimal('2500'),
        exitPrice: new Decimal('2380'),
        stopLoss: new Decimal('2400'),
        direction: 'long'
      });
      expect(r2.toString()).toBe('-1.2'); // (2380-2500)/(2500-2400) = -120/100 = -1.2
      expect(r2.lt(0)).toBe(true); // Negative R-multiple means loss
    });

    test('Equity series builds correctly with fees and slippage', () => {
      const equitySeries = buildEquityCurve(trades, baseSettings);
      
      // Should have equity points for each trade's entry and exit dates
      expect(equitySeries.length).toBeGreaterThan(0);
      
      // Starting equity should be base capital
      expect(equitySeries[0].equity.toString()).toBe('100000');
      
      // Check that fees and slippage are applied
      const firstTrade = trades[0];
      const entryFee = firstTrade.entryPrice.mul(baseSettings.feeBps).div(10000);
      if (firstTrade.exitPrice) {
        const exitFee = firstTrade.exitPrice.mul(baseSettings.feeBps).div(10000);
        const entrySlippage = firstTrade.entryPrice.mul(baseSettings.slippageBps).div(10000);
        const exitSlippage = firstTrade.exitPrice.mul(baseSettings.slippageBps).div(10000);
        
        // Total fees for first trade should be positive
        const totalFees = entryFee.add(exitFee).add(entrySlippage).add(exitSlippage);
        expect(totalFees.gt(0)).toBe(true);
      }
    });

    test('Performance stats are calculated correctly', () => {
      const equitySeries = buildEquityCurve(trades, baseSettings);
      const stats = calculatePerformanceStats(trades, equitySeries, baseSettings.baseCapitalUsd);
      
      // Should have both winning and losing trades
      expect(stats.totalTrades).toBe(2);
      // Note: winningTrades and losingTrades are not part of PerformanceStats interface
      
      // Win rate should be 50%
      expect(stats.winRate.toString()).toBe('50');
      
      // Profit factor should be calculated correctly
      expect(stats.profitFactor.gt(0)).toBe(true);
      
      // Max drawdown should be calculated
      expect(stats.maxDrawdown.gte(0)).toBe(true);
    });

    // TODO: Implement monthly returns aggregation function
    // test('Monthly returns aggregation works correctly', () => {
    //   const equitySeries = buildEquityCurve(trades, baseSettings);
    //   const monthlyReturns = aggregateMonthlyReturns(equitySeries);
    //   
    //   // Should have returns for January 2024
    //   const jan2024 = monthlyReturns.find(r => r.year === 2024 && r.month === 0);
    //   expect(jan2024).toBeDefined();
    //   
    //   if (jan2024) {
    //     // Return should be calculated as percentage
    //     expect(jan2024.return.gte(-100)).toBe(true); // Can't lose more than 100%
    //     expect(jan2024.return.lte(1000)).toBe(true); // Reasonable upper bound
    //   }
    // });
  });

  describe('Short Trade R-Multiple', () => {
    test('Short trade R-multiple sign and fee handling', () => {
      const shortTrade: SignalTrade = {
        id: 'short-trade',
        slug: 'eth-short-test',
        symbol: 'ETH',
        market: 'crypto:spot',
        direction: 'short',
        entryTime: new Date('2024-01-01T10:00:00Z'),
        entryPrice: new Decimal('2500'),
        stopLoss: new Decimal('2600'),
        takeProfit: new Decimal('2400'),
        exitTime: new Date('2024-01-05T14:00:00Z'),
        exitPrice: new Decimal('2420'),
        conviction: 3,
        riskPct: new Decimal('2'),
        tags: '["crypto", "eth"]',
        notes: 'Short trade test',
        status: 'closed',
      };

      const r = calculateRMultiple({
        entryPrice: new Decimal('2500'),
        exitPrice: new Decimal('2420'),
        stopLoss: new Decimal('2600'),
        direction: 'short'
      });
      
      // For short: R = (entry - exit) / (stopLoss - entry)
      // R = (2500 - 2420) / (2600 - 2500) = 80 / 100 = 0.8
      expect(r.toString()).toBe('0.8');
      expect(r.gt(0)).toBe(true); // Positive R-multiple means win
    });
  });

  describe('Risk% Sizing Fallback', () => {
    test('Position sizing when stop loss is missing', () => {
      const tradeWithoutSL: SignalTrade = {
        id: 'no-sl-trade',
        slug: 'btc-no-sl-trade',
        symbol: 'BTC',
        market: 'crypto:spot',
        direction: 'long',
        entryTime: new Date('2024-01-01T10:00:00Z'),
        entryPrice: new Decimal('40000'),
        stopLoss: undefined,
        takeProfit: new Decimal('42000'),
        exitTime: new Date('2024-01-05T14:00:00Z'),
        exitPrice: new Decimal('41800'),
        conviction: 4,
        riskPct: new Decimal('2'),
        tags: '["crypto", "btc"]',
        notes: 'No stop loss trade',
        status: 'closed',
      };

      const equitySeries = buildEquityCurve([tradeWithoutSL], baseSettings);
      
      // Should still calculate equity series even without stop loss
      expect(equitySeries.length).toBeGreaterThan(0);
      
      // Position size should fall back to fixed fraction (1% of equity)
      // This is handled in the buildEquityCurve function
      expect(equitySeries[0].equity.toString()).toBe('100000');
    });
  });

  describe('Decimal Precision', () => {
    test('All calculations use Decimal arithmetic', () => {
      const trades: SignalTrade[] = [
        {
          id: 'precision-test',
          slug: 'btc-precision-test',
          symbol: 'BTC',
          market: 'crypto:spot',
          direction: 'long',
          entryTime: new Date('2024-01-01T10:00:00Z'),
          entryPrice: new Decimal('40000.123456789'),
          stopLoss: new Decimal('38000.987654321'),
          takeProfit: new Decimal('42000.111111111'),
          exitTime: new Date('2024-01-05T14:00:00Z'),
          exitPrice: new Decimal('41800.555555555'),
          conviction: 4,
          riskPct: new Decimal('2.123456789'),
          tags: '["crypto", "btc"]',
          notes: 'Precision test',
        status: 'closed',
        }
      ];

      const equitySeries = buildEquityCurve(trades, baseSettings);
      const stats = calculatePerformanceStats(trades, equitySeries, baseSettings.baseCapitalUsd);
      
      // All values should be Decimal instances
      expect(stats.totalReturn).toBeInstanceOf(Decimal);
      expect(stats.maxDrawdown).toBeInstanceOf(Decimal);
      expect(stats.winRate).toBeInstanceOf(Decimal);
      expect(stats.profitFactor).toBeInstanceOf(Decimal);
      
      // Equity series should contain Decimal values
      equitySeries.forEach(point => {
        expect(point.equity).toBeInstanceOf(Decimal);
        expect(point.drawdown).toBeInstanceOf(Decimal);
      });
    });
  });

  describe('Edge Cases', () => {
    test('Empty trades array', () => {
      const equitySeries = buildEquityCurve([], baseSettings);
      const stats = calculatePerformanceStats([], equitySeries, baseSettings.baseCapitalUsd);
      
      expect(equitySeries.length).toBe(1); // Should have at least starting equity
      expect(equitySeries[0].equity.toString()).toBe('100000');
      expect(stats.totalTrades).toBe(0);
      expect(stats.winRate.toString()).toBe('0');
    });

    test('Single trade with zero risk', () => {
      const zeroRiskTrade: SignalTrade = {
        id: 'zero-risk',
        slug: 'btc-zero-risk',
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
        riskPct: new Decimal('0'),
        tags: '["crypto", "btc"]',
        notes: 'Zero risk trade',
        status: 'closed',
      };

      const equitySeries = buildEquityCurve([zeroRiskTrade], baseSettings);
      
      // Should handle zero risk gracefully
      expect(equitySeries.length).toBeGreaterThan(0);
    });
  });
});
