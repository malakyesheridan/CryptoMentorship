import { parseISO, isValid } from 'date-fns'
import type { PerformancePoint } from './types'

export interface ParsedSeriesCsv {
  points: PerformancePoint[]
  errors: string[]
  warnings: string[]
}

export function parseSeriesCsv(csvText: string): ParsedSeriesCsv {
  const errors: string[] = []
  const warnings: string[] = []
  const points: PerformancePoint[] = []

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    errors.push('CSV input is empty.')
    return { points, errors, warnings }
  }

  const header = lines[0].toLowerCase()
  const startIndex = header.includes('date') && header.includes('value') ? 1 : 0
  const seenDates = new Set<string>()

  for (let i = startIndex; i < lines.length; i += 1) {
    const row = lines[i]
    const [rawDate, rawValue] = row.split(',').map((cell) => cell.trim())
    if (!rawDate || !rawValue) {
      errors.push(`Line ${i + 1}: Expected "date,value".`)
      continue
    }

    const parsedDate = parseISO(rawDate)
    if (!isValid(parsedDate)) {
      errors.push(`Line ${i + 1}: Invalid date "${rawDate}". Use YYYY-MM-DD.`)
      continue
    }

    const value = Number(rawValue)
    if (!Number.isFinite(value) || value <= 0) {
      errors.push(`Line ${i + 1}: Value must be a number greater than 0.`)
      continue
    }

    const dateKey = parsedDate.toISOString().split('T')[0]
    if (seenDates.has(dateKey)) {
      errors.push(`Line ${i + 1}: Duplicate date "${dateKey}".`)
      continue
    }
    seenDates.add(dateKey)

    points.push({ date: dateKey, value })
  }

  if (points.length === 0 && errors.length === 0) {
    errors.push('No valid rows found in CSV.')
  }

  return { points, errors, warnings }
}
