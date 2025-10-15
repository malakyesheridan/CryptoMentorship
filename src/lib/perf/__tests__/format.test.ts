/// <reference path="../../../test/globals.d.ts" />
import { formatCurrency, formatPercentage, formatNumber, formatDate, getReturnColorClass } from '@/lib/perf/format'

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000')
      expect(formatCurrency(1000.50)).toBe('$1,000.50')
      expect(formatCurrency(1000000)).toBe('$1,000,000')
      expect(formatCurrency(0)).toBe('$0')
      expect(formatCurrency(-1000)).toBe('-$1,000')
    })

    it('should handle decimal precision', () => {
      expect(formatCurrency(1000.123, 1)).toBe('$1,000.1')
      expect(formatCurrency(1000.123, 3)).toBe('$1,000.123')
      expect(formatCurrency(1000.123, 0)).toBe('$1,000')
    })

    it('should handle very large numbers', () => {
      expect(formatCurrency(1234567890)).toBe('$1,234,567,890')
      expect(formatCurrency(0.000001)).toBe('$0.000001')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(0.245)).toBe('24.5%')
      expect(formatPercentage(0.05)).toBe('5%')
      expect(formatPercentage(1.0)).toBe('100%')
      expect(formatPercentage(0)).toBe('0%')
      expect(formatPercentage(-0.1)).toBe('-10%')
    })

    it('should handle decimal precision', () => {
      expect(formatPercentage(0.2456, 1)).toBe('24.6%')
      expect(formatPercentage(0.2456, 3)).toBe('24.560%')
      expect(formatPercentage(0.2456, 0)).toBe('25%')
    })

    it('should handle edge cases', () => {
      expect(formatPercentage(0.0001)).toBe('0.01%')
      expect(formatPercentage(100)).toBe('10,000%')
      expect(formatPercentage(-0.0001)).toBe('-0.01%')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers correctly', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000.50)).toBe('1,000.5')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(-1000)).toBe('-1,000')
    })

    it('should handle decimal precision', () => {
      expect(formatNumber(1000.123, 1)).toBe('1,000.1')
      expect(formatNumber(1000.123, 3)).toBe('1,000.123')
      expect(formatNumber(1000.123, 0)).toBe('1,000')
    })

    it('should handle very small numbers', () => {
      expect(formatNumber(0.000001)).toBe('0.000001')
      expect(formatNumber(0.000001, 2)).toBe('0.00')
    })

    it('should handle very large numbers', () => {
      expect(formatNumber(1234567890)).toBe('1,234,567,890')
      expect(formatNumber(1234567890.123)).toBe('1,234,567,890.123')
    })
  })

  describe('formatDate', () => {
    it('should format dates correctly with short format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date, 'short')).toBe('Jan 15')
    })

    it('should format dates correctly with long format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date, 'long')).toBe('January 15, 2024')
    })

    it('should format dates correctly with full format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date, 'full')).toBe('Monday, January 15, 2024')
    })

    it('should handle different time zones', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      // Note: Actual output may vary based on system timezone
      expect(formatDate(date, 'short')).toMatch(/Jan 15/)
    })

    it('should handle edge cases', () => {
      const date = new Date('2024-12-31T23:59:59Z')
      expect(formatDate(date, 'short')).toBe('Dec 31')
      expect(formatDate(date, 'long')).toBe('December 31, 2024')
    })

    it('should handle invalid dates', () => {
      const invalidDate = new Date('invalid')
      expect(formatDate(invalidDate, 'short')).toBe('Invalid Date')
    })
  })
})
