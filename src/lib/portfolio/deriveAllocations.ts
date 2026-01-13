export type RiskProfile = 'AGGRESSIVE' | 'SEMI' | 'CONSERVATIVE'

export type AllocationInput = {
  primary?: string | null
  secondary?: string | null
  tertiary?: string | null
}

export type Allocation = {
  symbol: string
  weight: number
}

const WEIGHT_TOLERANCE = 1e-6

function normalizeSymbol(value?: string | null): string {
  return (value ?? '').trim().toUpperCase()
}

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

export function deriveAllocations(
  riskProfile: RiskProfile,
  assets: AllocationInput
): Allocation[] {
  const primary = normalizeSymbol(assets.primary)
  const secondary = normalizeSymbol(assets.secondary)
  const tertiary = normalizeSymbol(assets.tertiary)

  let allocations: Allocation[] = []

  switch (riskProfile) {
    case 'AGGRESSIVE':
      assertCondition(primary.length > 0, 'Primary asset is required for aggressive allocations')
      allocations = [{ symbol: primary, weight: 1.0 }]
      break
    case 'SEMI':
      assertCondition(primary.length > 0, 'Primary asset is required for semi allocations')
      assertCondition(secondary.length > 0, 'Secondary asset is required for semi allocations')
      allocations = [
        { symbol: primary, weight: 0.8 },
        { symbol: secondary, weight: 0.2 },
      ]
      break
    case 'CONSERVATIVE':
      assertCondition(primary.length > 0, 'Primary asset is required for conservative allocations')
      assertCondition(secondary.length > 0, 'Secondary asset is required for conservative allocations')
      assertCondition(tertiary.length > 0, 'Tertiary asset is required for conservative allocations')
      allocations = [
        { symbol: primary, weight: 0.6 },
        { symbol: secondary, weight: 0.3 },
        { symbol: tertiary, weight: 0.1 },
      ]
      break
    default:
      throw new Error(`Unsupported risk profile: ${riskProfile}`)
  }

  const totalWeight = allocations.reduce((sum, allocation) => sum + allocation.weight, 0)
  assertCondition(
    Math.abs(totalWeight - 1.0) <= WEIGHT_TOLERANCE,
    `Allocation weights must sum to 1.0 (got ${totalWeight})`
  )

  return allocations
}
