import type { AllocationSnapshot, DashboardSettings, PerformancePoint, ValidationSummary } from './types'
import { normalizeSeries, parseDate } from './metrics'

const WEIGHT_TOLERANCE = 0.005
const STALE_DAYS_WARNING = 7

function validateSeries(points: PerformancePoint[], label: string, allowEmpty: boolean = false): ValidationSummary {
  const errors: string[] = []
  const warnings: string[] = []

  if (points.length === 0) {
    if (allowEmpty) {
      warnings.push(`${label} series has no data.`)
    } else {
      errors.push(`${label} series has no data.`)
    }
    return { errors, warnings }
  }

  const sorted = normalizeSeries(points)
  for (const point of sorted) {
    if (point.value <= 0) {
      errors.push(`${label} series contains non-positive values.`)
      break
    }
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prevDate = parseDate(sorted[i - 1].date)
    const currDate = parseDate(sorted[i].date)
    if (currDate.getTime() <= prevDate.getTime()) {
      warnings.push(`${label} series dates are not strictly increasing.`)
      break
    }
  }

  const lastDate = parseDate(sorted[sorted.length - 1].date)
  const now = new Date()
  const ageDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays > STALE_DAYS_WARNING) {
    warnings.push(`${label} series has not been updated in ${Math.floor(ageDays)} days.`)
  }

  return { errors, warnings }
}

function validateAllocation(allocation: AllocationSnapshot | null): ValidationSummary {
  const errors: string[] = []
  const warnings: string[] = []

  if (!allocation) {
    warnings.push('Allocation snapshot is missing.')
    return { errors, warnings }
  }

  let total = allocation.cashWeight
  if (allocation.cashWeight < 0 || allocation.cashWeight > 1) {
    errors.push('Cash weight must be between 0 and 1.')
  }

  for (const item of allocation.items) {
    if (item.weight < 0 || item.weight > 1) {
      errors.push(`Allocation weight for ${item.asset} must be between 0 and 1.`)
      break
    }
    total += item.weight
  }

  if (Math.abs(total - 1) > WEIGHT_TOLERANCE) {
    errors.push('Allocation weights must sum to 1.0 within 0.5% tolerance.')
  }

  return { errors, warnings }
}

export function buildValidationSummary(params: {
  settings: DashboardSettings | null
  modelSeries: PerformancePoint[]
  btcSeries: PerformancePoint[]
  ethSeries: PerformancePoint[]
  allocation: AllocationSnapshot | null
}): ValidationSummary {
  const summary: ValidationSummary = { errors: [], warnings: [] }

  if (!params.settings) {
    summary.errors.push('Dashboard settings are missing.')
  }

  const modelValidation = validateSeries(params.modelSeries, 'Model')
  summary.errors.push(...modelValidation.errors)
  summary.warnings.push(...modelValidation.warnings)

  const btcValidation = validateSeries(params.btcSeries, 'BTC', true)
  summary.errors.push(...btcValidation.errors)
  summary.warnings.push(...btcValidation.warnings)

  const ethValidation = validateSeries(params.ethSeries, 'ETH', true)
  summary.errors.push(...ethValidation.errors)
  summary.warnings.push(...ethValidation.warnings)

  const allocationValidation = validateAllocation(params.allocation)
  summary.errors.push(...allocationValidation.errors)
  summary.warnings.push(...allocationValidation.warnings)

  return summary
}
