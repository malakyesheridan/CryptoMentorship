import { toDate, formatDate, formatRelative, timeago } from '../dates'

// Jest globals - simplified approach
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any
declare const afterEach: any
declare const jest: any

describe('Date utilities', () => {
  describe('toDate', () => {
    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(toDate(date)).toEqual(date)
    })

    it('should handle ISO strings', () => {
      const date = toDate('2024-01-15T10:30:00Z')
      expect(date).toBeInstanceOf(Date)
      expect(date).not.toBeNull()
      if (date) {
        expect(date.getTime()).toBe(new Date('2024-01-15T10:30:00Z').getTime())
      }
    })

    it('should handle timestamps', () => {
      const timestamp = 1705312200000 // 2024-01-15T10:30:00Z
      const date = toDate(timestamp)
      expect(date).toBeInstanceOf(Date)
      expect(date).not.toBeNull()
      if (date) {
        expect(date.getTime()).toBe(timestamp)
      }
    })

    it('should handle invalid input gracefully', () => {
      const invalidDate = toDate('invalid-date')
      expect(invalidDate).toBeInstanceOf(Date)
      expect(invalidDate).not.toBeNull()
      if (invalidDate) {
        expect(isNaN(invalidDate.getTime())).toBe(true)
      }
    })
  })

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = formatDate(date)
      expect(formatted).toContain('January')
      expect(formatted).toContain('2024')
    })

    it('should handle custom formats', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = formatDate(date, 'yyyy-MM-dd')
      expect(formatted).toBe('2024-01-15')
    })

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid')
      const formatted = formatDate(invalidDate)
      expect(formatted).toBe('Invalid Date')
    })
  })

  describe('formatRelative', () => {
    beforeEach(() => {
      // Mock Date.now to a fixed time
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should show "just now" for recent dates', () => {
      const recent = new Date('2024-01-15T11:59:30Z')
      expect(formatRelative(recent)).toBe('just now')
    })

    it('should show minutes ago', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z')
      expect(formatRelative(fiveMinutesAgo)).toBe('5m ago')
    })

    it('should show hours ago', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z')
      expect(formatRelative(twoHoursAgo)).toBe('2h ago')
    })

    it('should show days ago', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z')
      expect(formatRelative(threeDaysAgo)).toBe('3d ago')
    })

    it('should show formatted date for older dates', () => {
      const oldDate = new Date('2024-01-01T12:00:00Z')
      const formatted = formatRelative(oldDate)
      expect(formatted).toContain('Jan')
    })
  })

  describe('timeago', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should format relative time with suffix', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z')
      const formatted = timeago(fiveMinutesAgo)
      expect(formatted).toContain('ago')
    })
  })
})
