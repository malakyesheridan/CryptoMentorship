/**
 * Database-level trade filtering utilities
 * Filters trades in database instead of loading all into memory
 */

import { Prisma } from '@prisma/client'
import { PerformanceScope } from './index'

/**
 * Build Prisma WHERE clause for trade filtering by scope
 * This filters in the database instead of loading all trades
 */
export function buildTradeScopeWhere(scope: PerformanceScope): Prisma.SignalTradeWhereInput {
  const now = new Date()
  let startDate: Date | undefined

  switch (scope) {
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case '1Y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
    case '90D':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'ALL':
      return {} // No filter - get all trades
    default:
      // Assume it's a date range string like "2024-01-01_2024-12-31"
      const [startStr, endStr] = scope.split('_')
      if (startStr && endStr) {
        const parsedStart = new Date(startStr)
        const parsedEnd = new Date(endStr)
        return {
          entryTime: {
            gte: parsedStart,
            lte: parsedEnd
          }
        }
      }
      return {} // Default to all if invalid format
  }

  if (startDate) {
    return {
      entryTime: {
        gte: startDate
      }
    }
  }

  return {}
}

