import Decimal from 'decimal.js'

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -50,
  toExpPos: 50,
  maxE: 9e15,
  minE: -9e15,
  modulo: Decimal.ROUND_FLOOR,
  crypto: false
})

export { Decimal }

/**
 * Create a Decimal from various input types
 */
export const D = (x: number | string | Decimal): Decimal => {
  if (x instanceof Decimal) {
    return x
  }
  return new Decimal(x)
}

/**
 * Convert Decimal to number with controlled precision
 * Uses 15 significant digits to avoid floating point precision issues
 * Handles various input types safely
 */
export const toNum = (d: Decimal | number | string | null | undefined): number => {
  // Handle null/undefined
  if (d == null) {
    return 0
  }
  
  // If already a number, return it
  if (typeof d === 'number') {
    return d
  }
  
  // If it's a string, try to parse it
  if (typeof d === 'string') {
    const parsed = Number(d)
    return isNaN(parsed) ? 0 : parsed
  }
  
  // If it's a Decimal object, convert it
  if (d instanceof Decimal) {
    return Number(d.toSignificantDigits(15).toString())
  }
  
  // If it has toSignificantDigits method (Prisma Decimal type), use it
  if (d && typeof d === 'object' && 'toSignificantDigits' in d && typeof (d as any).toSignificantDigits === 'function') {
    return Number((d as any).toSignificantDigits(15).toString())
  }
  
  // If it has toNumber method (Prisma Decimal type), use it
  if (d && typeof d === 'object' && 'toNumber' in d && typeof (d as any).toNumber === 'function') {
    return (d as any).toNumber()
  }
  
  // Fallback: try to convert to number
  const num = Number(d)
  return isNaN(num) ? 0 : num
}

/**
 * Convert Decimal to string with fixed decimal places
 */
export const toFixed = (d: Decimal, places: number = 2): string => {
  return d.toFixed(places)
}

/**
 * Convert Decimal to percentage string
 */
export const toPercentage = (d: Decimal, places: number = 2): string => {
  return d.mul(100).toFixed(places) + '%'
}

/**
 * Convert Decimal to currency string
 */
export const toCurrency = (d: Decimal, places: number = 2): string => {
  return '$' + d.toFixed(places)
}

/**
 * Safe division that handles division by zero
 */
export const safeDiv = (a: Decimal, b: Decimal): Decimal => {
  if (b.isZero()) {
    return D(0)
  }
  return a.div(b)
}

/**
 * Calculate percentage change between two values
 */
export const percentageChange = (from: Decimal, to: Decimal): Decimal => {
  if (from.isZero()) {
    return D(0)
  }
  return to.sub(from).div(from)
}

/**
 * Apply basis points to a value
 */
export const applyBasisPoints = (value: Decimal, bps: number): Decimal => {
  return value.mul(D(bps)).div(D(10000))
}

/**
 * Calculate fees and slippage
 */
export const calculateCosts = (
  value: Decimal, 
  feeBps: number, 
  slippageBps: number
): Decimal => {
  const fee = applyBasisPoints(value, feeBps)
  const slippage = applyBasisPoints(value, slippageBps)
  return fee.add(slippage)
}

/**
 * Round to nearest cent (2 decimal places)
 */
export const roundToCent = (d: Decimal): Decimal => {
  return d.toDecimalPlaces(2)
}

/**
 * Check if a Decimal is approximately equal to another within tolerance
 */
export const isApproximatelyEqual = (
  a: Decimal, 
  b: Decimal, 
  tolerance: Decimal = D(0.0001)
): boolean => {
  return a.sub(b).abs().lte(tolerance)
}
