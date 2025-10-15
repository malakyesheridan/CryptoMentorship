/// <reference path="../../../test/globals.d.ts" />
// Jest globals - simplified approach
declare const describe: any
declare const it: any
declare const expect: any
import { calculateRMultiple } from '@/lib/perf/r'
import { Decimal } from '@/lib/num/dec'

describe('R-Multiple Calculations', () => {
  describe('calculateRMultiple', () => {
    it('should calculate R-multiple for long trades with stop loss', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(110),
        stopLoss: new Decimal(90),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 100 - 90 = 10
      // Profit per share = 110 - 100 = 10
      // R-multiple = 10 / 10 = 1.0
      expect(rMultiple).toBeCloseTo(1.0, 2)
    })

    it('should calculate R-multiple for short trades with stop loss', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(90),
        stopLoss: new Decimal(110),
        direction: 'short' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 110 - 100 = 10
      // Profit per share = 100 - 90 = 10
      // R-multiple = 10 / 10 = 1.0
      expect(rMultiple).toBeCloseTo(1.0, 2)
    })

    it('should calculate negative R-multiple for losing long trades', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(85),
        stopLoss: new Decimal(90),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 100 - 90 = 10
      // Loss per share = 100 - 85 = 15
      // R-multiple = -15 / 10 = -1.5
      expect(rMultiple).toBeCloseTo(-1.5, 2)
    })

    it('should calculate negative R-multiple for losing short trades', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(115),
        stopLoss: new Decimal(110),
        direction: 'short' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 110 - 100 = 10
      // Loss per share = 115 - 100 = 15
      // R-multiple = -15 / 10 = -1.5
      expect(rMultiple).toBeCloseTo(-1.5, 2)
    })

    it('should handle trades without stop loss using risk percentage', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(110),
        stopLoss: undefined,
        riskPct: new Decimal(2.0),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Virtual risk = 2% of entry price = 2
      // Profit per share = 110 - 100 = 10
      // R-multiple = 10 / 2 = 5.0
      expect(rMultiple).toBeCloseTo(5.0, 2)
    })

    it('should handle trades without stop loss and risk percentage', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(110),
        stopLoss: undefined,
        riskPct: undefined,
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Default risk = 1% of entry price = 1
      // Profit per share = 110 - 100 = 10
      // R-multiple = 10 / 1 = 10.0
      expect(rMultiple).toBeCloseTo(10.0, 2)
    })

    it('should handle break-even trades', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(100),
        stopLoss: new Decimal(90),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 100 - 90 = 10
      // Profit per share = 100 - 100 = 0
      // R-multiple = 0 / 10 = 0
      expect(rMultiple).toBeCloseTo(0, 2)
    })

    it('should handle trades that hit stop loss exactly', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(90),
        stopLoss: new Decimal(90),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 100 - 90 = 10
      // Loss per share = 100 - 90 = 10
      // R-multiple = -10 / 10 = -1.0
      expect(rMultiple).toBeCloseTo(-1.0, 2)
    })

    it('should handle trades that hit take profit exactly', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(120),
        stopLoss: new Decimal(90),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Risk per share = 100 - 90 = 10
      // Profit per share = 120 - 100 = 20
      // R-multiple = 20 / 10 = 2.0
      expect(rMultiple).toBeCloseTo(2.0, 2)
    })

    it('should handle edge case with zero entry price', () => {
      const trade = {
        entryPrice: new Decimal(0),
        exitPrice: new Decimal(10),
        stopLoss: undefined,
        riskPct: new Decimal(2.0),
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Should return 0 to avoid division by zero
      expect(rMultiple).toBe(0)
    })

    it('should handle edge case with zero stop loss distance', () => {
      const trade = {
        entryPrice: new Decimal(100),
        exitPrice: new Decimal(110),
        stopLoss: new Decimal(100), // Same as entry price
        direction: 'long' as const
      }
      
      const rMultiple = calculateRMultiple(trade)
      
      // Should fall back to risk percentage calculation
      expect(rMultiple).toBeCloseTo(10.0, 2) // 10 / 1 (default 1% risk)
    })
  })
})
