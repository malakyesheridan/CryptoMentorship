import { prisma } from '@/lib/prisma'

/** Fetch all active strategies with their latest snapshot */
export async function getActiveStrategies() {
  return prisma.strategy.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      snapshots: {
        orderBy: { date: 'desc' },
        take: 1,
      },
      equityCurve: {
        orderBy: { date: 'desc' },
        take: 30, // last 30 days for sparkline
      },
    },
  })
}

/** Fetch a single strategy by slug with full detail */
export async function getStrategyBySlug(slug: string) {
  return prisma.strategy.findUnique({
    where: { slug },
    include: {
      snapshots: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })
}

/** Fetch equity curve data for a strategy */
export async function getEquityCurve(strategyId: string) {
  return prisma.equityCurvePoint.findMany({
    where: { strategyId },
    orderBy: { date: 'asc' },
  })
}

/** Fetch recent updates for a strategy */
export async function getStrategyUpdates(strategyId: string, limit = 20) {
  return prisma.strategyUpdate.findMany({
    where: { strategyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Fetch all strategies for admin (including inactive) */
export async function getAllStrategies() {
  return prisma.strategy.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      snapshots: {
        orderBy: { date: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          equityCurve: true,
          updates: true,
        },
      },
    },
  })
}

/** Fetch strategy by ID for admin edit */
export async function getStrategyById(id: string) {
  return prisma.strategy.findUnique({
    where: { id },
    include: {
      snapshots: {
        orderBy: { date: 'desc' },
        take: 5,
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
}

/** Get pending notification updates */
export async function getPendingNotifyUpdates() {
  return prisma.strategyUpdate.findMany({
    where: { notify: true },
    orderBy: { createdAt: 'desc' },
    include: {
      strategy: true,
    },
  })
}
