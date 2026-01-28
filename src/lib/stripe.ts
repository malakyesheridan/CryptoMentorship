import Stripe from 'stripe'
import { loadStripe, Stripe as StripeType } from '@stripe/stripe-js'

// Lazy import env only for server-side code to avoid client-side validation errors
let env: any = null
function getEnv() {
  if (typeof window === 'undefined' && !env) {
    // Only import env on server-side
    env = require('@/lib/env').env
  }
  return env
}

/**
 * Server-side Stripe client
 * Used in API routes and server components
 * Only initialized if STRIPE_SECRET_KEY is configured
 */
function getStripeSecretKey(): string | undefined {
  if (typeof window !== 'undefined') {
    // Client-side: env vars not available
    return undefined
  }
  const serverEnv = getEnv()
  return serverEnv?.STRIPE_SECRET_KEY
}

const stripeSecretKey = getStripeSecretKey()

export const stripe: Stripe | null = stripeSecretKey && stripeSecretKey.length > 0
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  : null

/**
 * Client-side Stripe.js instance (lazy-loaded)
 * Used in client components for checkout redirects
 */
let stripePromise: Promise<StripeType | null> | null = null

export function getStripe(): Promise<StripeType | null> {
  // Use process.env directly for client-side (NEXT_PUBLIC_ vars are available)
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  
  if (!publishableKey) {
    return Promise.resolve(null)
  }
  
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

/**
 * Get Stripe Price ID for a tier and interval
 * @param tier Membership tier (T1=Growth, T2=Elite)
 * @param interval Billing interval ('month' | '3month' | '6month' | 'year')
 * @returns Price ID or null if not configured
 * 
 * Uses direct price IDs provided by user:
 * - T1 (Growth): price_1SY8EnDJPZctYjdrOe17Be03 (month), price_1SY8FEDJPZctYjdrqPib2orr (3mo), etc.
 * - T2 (Elite): price_1SY8LDDJPZctYjdrT4O6cPG2 (month), price_1SY8LiDJPZctYjdrBqXTPU7W (3mo), etc.
 */
export function getPriceId(tier: string, interval: 'month' | '3month' | '6month' | 'year'): string | null {
  // This function should only be called server-side, but handle client-side gracefully
  if (typeof window !== 'undefined') {
    return null // Client-side: price IDs not available
  }
  
  const serverEnv = getEnv()
  if (!serverEnv) {
    return null
  }
  
  // Direct price ID mapping for new 2-tier system
  const priceIdMap: Record<string, Record<string, string>> = {
    'T1': {
      'month': 'price_1SY8EnDJPZctYjdrOe17Be03',   // Growth: month
      '3month': 'price_1SY8FEDJPZctYjdrqPib2orr',  // Growth: 3mo
      '6month': 'price_1SY8FYDJPZctYjdrzlBsia3L', // Growth: 6mo
      'year': 'price_1SY8FoDJPZctYjdr1UIZ0CCS',   // Growth: 1year
    },
    'T2': {
      'month': 'price_1SuXk2DJPZctYjdrTXSH3JXB',   // Elite (Founders): month
      '3month': 'price_1SY8LiDJPZctYjdrBqXTPU7W',  // Elite: 3mo
      '6month': 'price_1SY8MDDJPZctYjdrZseyMyhC',  // Elite: 6mo
      'year': 'price_1SY8McDJPZctYjdrR1oSbHeW',    // Elite: 1year
    },
  }
  
  const tierMap = priceIdMap[tier]
  if (!tierMap) {
    return null
  }
  
  return tierMap[interval] || null
}

/**
 * Get tier from Stripe Price ID (reverse lookup)
 * @param priceId Stripe Price ID
 * @returns Tier (T1=Growth, T2=Elite) or null if not found
 * 
 * Uses direct price ID mapping for new 2-tier system
 */
export function getTierFromPriceId(priceId: string): string | null {
  // Direct price ID mapping for new 2-tier system
  const growthPriceIds = [
    'price_1SY8EnDJPZctYjdrOe17Be03',  // Growth: month
    'price_1SY8FEDJPZctYjdrqPib2orr',  // Growth: 3mo
    'price_1SY8FYDJPZctYjdrzlBsia3L', // Growth: 6mo
    'price_1SY8FoDJPZctYjdr1UIZ0CCS', // Growth: 1year
  ]
  
  const elitePriceIds = [
    'price_1SuXk2DJPZctYjdrTXSH3JXB',  // Elite (Founders): month
    'price_1SY8LDDJPZctYjdrT4O6cPG2',  // Elite: month (legacy)
    'price_1SY8LiDJPZctYjdrBqXTPU7W',  // Elite: 3mo
    'price_1SY8MDDJPZctYjdrZseyMyhC',  // Elite: 6mo
    'price_1SY8McDJPZctYjdrR1oSbHeW',  // Elite: 1year
  ]
  
  if (growthPriceIds.includes(priceId)) {
    return 'T1' // Growth
  }
  
  if (elitePriceIds.includes(priceId)) {
    return 'T2' // Elite
  }
  
  // Fallback: check old env vars for backward compatibility
  if (typeof window === 'undefined') {
    const serverEnv = getEnv()
    if (serverEnv) {
      // Check old T3 price IDs (maps to new T2/Elite)
      const t3Intervals = ['MONTHLY', '3MONTH', '6MONTH', 'ANNUAL'] as const
      for (const interval of t3Intervals) {
        const key = `STRIPE_PRICE_T3_${interval}` as keyof typeof serverEnv
        if (serverEnv[key] === priceId) {
          return 'T2' // Old T3 → new T2 (Elite)
        }
      }
      
      // Check old T2 price IDs (maps to new T1/Growth)
      const t2Intervals = ['MONTHLY', '3MONTH', '6MONTH', 'ANNUAL'] as const
      for (const interval of t2Intervals) {
        const key = `STRIPE_PRICE_T2_${interval}` as keyof typeof serverEnv
        if (serverEnv[key] === priceId) {
          return 'T1' // Old T2 → new T1 (Growth)
        }
      }
    }
  }
  
  return null
}

/**
 * Check if Stripe is configured
 * Server-side only - checks both secret and publishable keys
 */
export function isStripeConfigured(): boolean {
  if (typeof window !== 'undefined') {
    // Client-side: only check publishable key
    return !!(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.length > 0
    )
  }
  
  // Server-side: check both keys
  const serverEnv = getEnv()
  return !!(
    stripe &&
    serverEnv?.STRIPE_SECRET_KEY &&
    serverEnv?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    serverEnv.STRIPE_SECRET_KEY.length > 0 &&
    serverEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.length > 0
  )
}

