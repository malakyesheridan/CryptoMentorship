import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getDailyCloses } from '@/lib/prices/provider'
import { Decimal, D, toNum } from '@/lib/num/dec'

const PORTFOLIO_SCOPE = 'PORTFOLIO'
const NAV_SERIES_TYPE = 'MODEL_NAV'

type AllocationItem = { asset: string; weight: number }

function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toDateKey(date: Date): string {
  return toUtcDate(date).toISOString().slice(0, 10)
}

function parseDateKey(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function listDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  let cursor = toUtcDate(startDate)
  const end = toUtcDate(endDate)
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

async function ingestPrices(symbols: string[], startDate: string, endDate: string) {
  if (symbols.length === 0) return
  const closesBySymbol = await getDailyCloses(symbols, startDate, endDate)

  for (const [symbol, closes] of closesBySymbol.entries()) {
    if (closes.length === 0) continue
    const source = symbol === 'CASH' ? 'cash' : 'coingecko'
    for (const close of closes) {
      const date = parseDateKey(close.date)
      await prisma.assetPriceDaily.upsert({
        where: {
          symbol_date: {
            symbol,
            date
          }
        },
        update: {
          close: close.close,
          source
        },
        create: {
          symbol,
          date,
          close: close.close,
          source
        }
      })
    }
  }
}

function fillPricesForDates(
  symbols: string[],
  rows: Array<{ symbol: string; date: Date; close: Decimal }>,
  dates: Date[]
): Map<string, Map<string, Decimal>> {
  const rowsBySymbol = new Map<string, Array<{ dateKey: string; close: Decimal }>>()
  for (const row of rows) {
    const dateKey = toDateKey(row.date)
    const existing = rowsBySymbol.get(row.symbol) ?? []
    existing.push({ dateKey, close: row.close as Decimal })
    rowsBySymbol.set(row.symbol, existing)
  }

  for (const [symbol, entries] of rowsBySymbol.entries()) {
    entries.sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0))
  }

  const filled = new Map<string, Map<string, Decimal>>()
  const dateKeys = dates.map((date) => toDateKey(date))

  for (const symbol of symbols) {
    const entries = rowsBySymbol.get(symbol) ?? []
    let index = 0
    let lastClose: Decimal | null = null
    const symbolMap = new Map<string, Decimal>()

    for (const dateKey of dateKeys) {
      while (index < entries.length && entries[index].dateKey <= dateKey) {
        lastClose = entries[index].close
        index += 1
      }
      if (lastClose) {
        symbolMap.set(dateKey, lastClose)
      }
    }

    filled.set(symbol, symbolMap)
  }

  return filled
}

function computeNavSeries(params: {
  dates: Date[]
  allocationsByDate: Map<string, AllocationItem[]>
  pricesBySymbol: Map<string, Map<string, Decimal>>
}) {
  const navSeries: Array<{ dateKey: string; nav: Decimal; dailyReturn: Decimal }> = []
  let nav = D(100)
  let initialized = false

  for (let index = 0; index < params.dates.length; index += 1) {
    const date = params.dates[index]
    const dateKey = toDateKey(date)
    const prevDateKey = index > 0 ? toDateKey(params.dates[index - 1]) : null
    const allocations = params.allocationsByDate.get(dateKey)

    if (!allocations || allocations.length === 0) {
      continue
    }

    if (!prevDateKey) {
      continue
    }

    let dailyReturn = D(0)
    let hasPrices = true

    for (const allocation of allocations) {
      const symbolPrices = params.pricesBySymbol.get(allocation.asset)
      const priceToday = symbolPrices?.get(dateKey)
      const pricePrev = symbolPrices?.get(prevDateKey)
      if (!priceToday || !pricePrev) {
        hasPrices = false
        break
      }

      const weight = D(allocation.weight)
      const priceRatio = D(priceToday).div(pricePrev).minus(1)
      dailyReturn = dailyReturn.add(weight.mul(priceRatio))
    }

    if (!hasPrices) {
      if (!initialized) {
        continue
      }
      logger.warn('Missing price data for NAV calculation day', { date: dateKey })
      continue
    }

    if (!initialized) {
      initialized = true
      nav = D(100)
      navSeries.push({ dateKey, nav, dailyReturn: D(0) })
      continue
    }

    nav = nav.mul(D(1).add(dailyReturn))
    navSeries.push({ dateKey, nav, dailyReturn })
  }

  return navSeries
}

function buildAllocationsByDate(
  allocations: Array<{ asOfDate: Date; items: AllocationItem[] }>,
  dates: Date[]
): Map<string, AllocationItem[]> {
  const allocationMap = new Map<string, AllocationItem[]>()
  if (allocations.length === 0) return allocationMap

  const sorted = [...allocations].sort((a, b) => a.asOfDate.getTime() - b.asOfDate.getTime())
  let pointer = 0
  let active: AllocationItem[] | null = null

  for (const date of dates) {
    while (pointer < sorted.length && sorted[pointer].asOfDate <= date) {
      active = sorted[pointer].items
      pointer += 1
    }
    if (active) {
      allocationMap.set(toDateKey(date), active)
    }
  }

  return allocationMap
}

function computeMetrics(navSeries: Array<{ dateKey: string; nav: Decimal; dailyReturn: Decimal }>) {
  if (navSeries.length === 0) {
    return {
      roiInception: D(0),
      roi30d: D(0),
      maxDrawdown: D(0),
      volatility: D(0),
      asOfDate: null as Date | null
    }
  }

  const first = navSeries[0]
  const last = navSeries[navSeries.length - 1]
  const roiInception = last.nav.div(first.nav).minus(1).mul(100)

  const lastDate = parseDateKey(last.dateKey)
  const lookbackDate = addDays(lastDate, -30)
  const lookbackKey = toDateKey(lookbackDate)
  const lookbackPoint = navSeries.find((point) => point.dateKey >= lookbackKey) ?? first
  const roi30d = last.nav.div(lookbackPoint.nav).minus(1).mul(100)

  let peak = navSeries[0].nav
  let maxDrawdown = D(0)
  for (const point of navSeries) {
    if (point.nav.gt(peak)) {
      peak = point.nav
    }
    const drawdown = point.nav.div(peak).minus(1).mul(100)
    if (drawdown.lt(maxDrawdown)) {
      maxDrawdown = drawdown
    }
  }

  const returns = navSeries.map((point) => toNum(point.dailyReturn))
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const volatility = D(stdDev * Math.sqrt(365) * 100)

  return {
    roiInception,
    roi30d,
    maxDrawdown,
    volatility,
    asOfDate: parseDateKey(last.dateKey)
  }
}

export async function runPortfolioRoiJob() {
  const dirtyPortfolios = await prisma.roiDashboardSnapshot.findMany({
    where: { scope: PORTFOLIO_SCOPE, needsRecompute: true }
  })

  if (dirtyPortfolios.length === 0) {
    return { processed: 0 }
  }

  for (const snapshot of dirtyPortfolios) {
    if (!snapshot.portfolioKey) {
      continue
    }

    const portfolioKey = snapshot.portfolioKey
    const allocations = await prisma.allocationSnapshot.findMany({
      where: { portfolioKey },
      orderBy: { asOfDate: 'asc' }
    })

    if (allocations.length === 0) {
      logger.warn('No allocation snapshots for portfolio key', { portfolioKey })
      await prisma.roiDashboardSnapshot.update({
        where: { id: snapshot.id },
        data: {
          needsRecompute: false,
          recomputeFromDate: null,
          lastComputedAt: new Date()
        }
      })
      continue
    }

    const earliestAllocationDate = toUtcDate(allocations[0].asOfDate)
    const recomputeFrom = snapshot.recomputeFromDate ? toUtcDate(snapshot.recomputeFromDate) : earliestAllocationDate
    const startDate = recomputeFrom < earliestAllocationDate ? recomputeFrom : earliestAllocationDate
    const endDate = toUtcDate(new Date())
    const priceStartDate = addDays(startDate, -2)

    const symbols = Array.from(
      new Set(
        allocations
          .flatMap((allocation) => Array.isArray(allocation.items) ? allocation.items : [])
          .map((item: any) => String(item.asset ?? '').trim().toUpperCase())
          .filter((item) => item.length > 0)
      )
    )

    if (symbols.length === 0) {
      logger.warn('No allocation symbols for portfolio key', { portfolioKey })
      continue
    }

    await ingestPrices(symbols, toDateKey(priceStartDate), toDateKey(endDate))

    const priceRows = await prisma.assetPriceDaily.findMany({
      where: {
        symbol: { in: symbols },
        date: {
          gte: priceStartDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    })

    const dateRange = listDates(priceStartDate, endDate)
    const pricesBySymbol = fillPricesForDates(symbols, priceRows, dateRange)
    const allocationsByDate = buildAllocationsByDate(
      allocations.map((allocation) => ({
        asOfDate: toUtcDate(allocation.asOfDate),
        items: Array.isArray(allocation.items) ? (allocation.items as AllocationItem[]) : []
      })),
      dateRange
    )

    const navSeries = computeNavSeries({
      dates: dateRange,
      allocationsByDate,
      pricesBySymbol
    })

    if (navSeries.length === 0) {
      logger.warn('No NAV series computed for portfolio key', { portfolioKey })
      continue
    }

    await prisma.$transaction(
      navSeries.map((point) =>
        prisma.performanceSeries.upsert({
          where: {
            seriesType_date_portfolioKey: {
              seriesType: NAV_SERIES_TYPE,
              date: parseDateKey(point.dateKey),
              portfolioKey
            }
          },
          update: { value: point.nav },
          create: {
            seriesType: NAV_SERIES_TYPE,
            date: parseDateKey(point.dateKey),
            portfolioKey,
            value: point.nav
          }
        })
      )
    )

    const metrics = computeMetrics(navSeries)
    await prisma.roiDashboardSnapshot.update({
      where: { id: snapshot.id },
      data: {
        needsRecompute: false,
        recomputeFromDate: null,
        asOfDate: metrics.asOfDate,
        roiInception: metrics.roiInception,
        roi30d: metrics.roi30d,
        maxDrawdown: metrics.maxDrawdown,
        volatility: metrics.volatility,
        lastComputedAt: new Date()
      }
    })
  }

  return { processed: dirtyPortfolios.length }
}
