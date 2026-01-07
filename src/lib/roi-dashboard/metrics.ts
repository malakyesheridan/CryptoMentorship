import { addMonths, startOfMonth } from 'date-fns'
import type { AllocationSnapshot, PerformancePoint, SimulatorInput, SimulatorResult } from './types'

const DATE_ONLY_LENGTH = 10

function parseDate(value: string): Date {
  if (!value) return new Date('Invalid Date')
  if (value.length <= DATE_ONLY_LENGTH) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return new Date(value)
}

function formatDate(value: Date): string {
  return value.toISOString().split('T')[0]
}

export function normalizeSeries(points: PerformancePoint[]): PerformancePoint[] {
  return [...points].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
}

export function findNearestOnOrBefore(points: PerformancePoint[], targetDate: Date): PerformancePoint | null {
  if (points.length === 0) return null
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (parseDate(points[i].date).getTime() <= targetDate.getTime()) {
      return points[i]
    }
  }
  return null
}

export function calculateRoiSinceInception(points: PerformancePoint[]): number {
  if (points.length < 2) return 0
  const sorted = normalizeSeries(points)
  const first = sorted[0]?.value ?? 0
  const last = sorted[sorted.length - 1]?.value ?? 0
  if (first <= 0) return 0
  return ((last / first) - 1) * 100
}

export function calculateRoiLastNDays(points: PerformancePoint[], days: number): number {
  if (points.length < 2) return 0
  const sorted = normalizeSeries(points)
  const lastPoint = sorted[sorted.length - 1]
  const lastDate = parseDate(lastPoint.date)
  const targetDate = new Date(lastDate.getTime() - days * 24 * 60 * 60 * 1000)
  const startPoint = findNearestOnOrBefore(sorted, targetDate) ?? sorted[0]
  if (startPoint.value <= 0) return 0
  return ((lastPoint.value / startPoint.value) - 1) * 100
}

export function calculateMaxDrawdown(points: PerformancePoint[]): number {
  if (points.length < 2) return 0
  const sorted = normalizeSeries(points)
  let peak = sorted[0].value
  let maxDrawdownPct = 0
  for (const point of sorted) {
    if (point.value > peak) {
      peak = point.value
      continue
    }
    if (peak > 0) {
      const drawdownPct = ((point.value / peak) - 1) * 100
      if (drawdownPct < maxDrawdownPct) {
        maxDrawdownPct = drawdownPct
      }
    }
  }
  return maxDrawdownPct
}

export function calculateAllocationSplit(allocation: AllocationSnapshot | null): {
  investedPct: number
  cashPct: number
} {
  if (!allocation) {
    return { investedPct: 0, cashPct: 0 }
  }
  const cashPct = Math.max(0, Math.min(1, allocation.cashWeight)) * 100
  const investedPct = Math.max(0, 100 - cashPct)
  return { investedPct, cashPct }
}

function getContributionDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const startMonth = startOfMonth(startDate)
  let cursor = startDate.getUTCDate() === 1
    ? startMonth
    : addMonths(startMonth, 1)
  while (cursor.getTime() <= endDate.getTime()) {
    dates.push(cursor)
    cursor = addMonths(cursor, 1)
  }
  return dates
}

function calculateMaxDrawdownFromBalances(series: Array<{ date: string; balance: number }>): {
  maxDrawdownPct: number
  maxDrawdownAmount: number
} {
  if (series.length < 2) {
    return { maxDrawdownPct: 0, maxDrawdownAmount: 0 }
  }
  let peak = series[0].balance
  let maxDrawdownPct = 0
  let maxDrawdownAmount = 0
  for (const point of series) {
    if (point.balance > peak) {
      peak = point.balance
      continue
    }
    const drawdownAmount = peak - point.balance
    const drawdownPct = peak > 0 ? ((point.balance / peak) - 1) * 100 : 0
    if (drawdownPct < maxDrawdownPct) {
      maxDrawdownPct = drawdownPct
      maxDrawdownAmount = drawdownAmount
    }
  }
  return { maxDrawdownPct, maxDrawdownAmount }
}

export function runSimulation(
  points: PerformancePoint[],
  input: SimulatorInput
): SimulatorResult {
  const sorted = normalizeSeries(points)
  if (sorted.length === 0) {
    return {
      series: [],
      finalBalance: 0,
      totalContributed: 0,
      profit: 0,
      roiPct: 0,
      maxDrawdownPct: 0,
      maxDrawdownAmount: 0
    }
  }

  const startingCapital = Math.max(0, input.startingCapital)
  const monthlyContribution = Math.max(0, input.monthlyContribution)
  const targetStartDate = parseDate(input.startDate)
  const lastPoint = sorted[sorted.length - 1]
  const lastDate = parseDate(lastPoint.date)
  const resolvedStartPoint = findNearestOnOrBefore(sorted, targetStartDate) ?? sorted[0]
  const startValue = resolvedStartPoint.value || 1
  const startDate = parseDate(resolvedStartPoint.date)
  const windowSeries = sorted.filter((point) => parseDate(point.date).getTime() >= startDate.getTime())

  const contributionDates = input.includeMonthlyContributions
    ? getContributionDates(startDate, lastDate)
    : []
  const contributionPoints = contributionDates.map((date) => ({
    date,
    point: findNearestOnOrBefore(sorted, date)
  }))

  const series = windowSeries.map((point) => {
    let balance = startValue > 0 ? startingCapital * (point.value / startValue) : startingCapital
    if (input.includeMonthlyContributions && monthlyContribution > 0) {
      for (const contribution of contributionPoints) {
        if (!contribution.point) continue
        if (parseDate(point.date).getTime() < contribution.date.getTime()) continue
        const contributionValue = contribution.point.value || 1
        balance += (point.value / contributionValue) * monthlyContribution
      }
    }
    return {
      date: point.date,
      balance
    }
  })

  const totalContributed = startingCapital + monthlyContribution * contributionDates.length
  const finalBalance = series.length > 0 ? series[series.length - 1].balance : startingCapital
  const profit = finalBalance - totalContributed
  const roiPct = totalContributed > 0 ? (profit / totalContributed) * 100 : 0
  const drawdown = calculateMaxDrawdownFromBalances(series)

  return {
    series,
    finalBalance,
    totalContributed,
    profit,
    roiPct,
    maxDrawdownPct: drawdown.maxDrawdownPct,
    maxDrawdownAmount: drawdown.maxDrawdownAmount
  }
}

export { formatDate, parseDate }
