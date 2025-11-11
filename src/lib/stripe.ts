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
 * @param tier Membership tier (T1, T2, T3)
 * @param interval Billing interval ('month' | '3month' | '6month' | 'year')
 * @returns Price ID or null if not configured
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
  
  // Special handling for T3 tier - price IDs are swapped in Stripe
  // Monthly ($2,000) is stored as ANNUAL, 3month ($5,750) as MONTHLY, 6month ($10,500) as 3MONTH, Annual ($20,000) as 6MONTH
  if (tier === 'T3') {
    const t3Mapping: Record<string, string> = {
      'month': 'STRIPE_PRICE_T3_ANNUAL',    // $2,000 monthly -> uses ANNUAL price ID
      '3month': 'STRIPE_PRICE_T3_MONTHLY',  // $5,750 3-month -> uses MONTHLY price ID
      '6month': 'STRIPE_PRICE_T3_3MONTH',   // $10,500 6-month -> uses 3MONTH price ID
      'year': 'STRIPE_PRICE_T3_6MONTH',     // $20,000 annual -> uses 6MONTH price ID
    }
    const key = t3Mapping[interval] as keyof typeof serverEnv
    const priceId = serverEnv[key]
    return typeof priceId === 'string' && priceId.length > 0 ? priceId : null
  }
  
  // Special handling for T2 tier - swap 3month and 6month price IDs
  if (tier === 'T2') {
    const t2Mapping: Record<string, string> = {
      'month': 'STRIPE_PRICE_T2_MONTHLY',
      '3month': 'STRIPE_PRICE_T2_6MONTH',   // 3-month uses 6-month price ID
      '6month': 'STRIPE_PRICE_T2_3MONTH',   // 6-month uses 3-month price ID
      'year': 'STRIPE_PRICE_T2_ANNUAL',
    }
    const key = t2Mapping[interval] as keyof typeof serverEnv
    const priceId = serverEnv[key]
    return typeof priceId === 'string' && priceId.length > 0 ? priceId : null
  }
  
  // Normalize interval to match env var naming for T1
  let intervalKey = interval.toUpperCase()
  if (intervalKey === 'YEAR') {
    intervalKey = 'ANNUAL'
  } else if (intervalKey === '3MONTH') {
    intervalKey = '3MONTH'
  } else if (intervalKey === '6MONTH') {
    intervalKey = '6MONTH'
  } else if (intervalKey === 'MONTH') {
    intervalKey = 'MONTHLY'
  }
  
  const key = `STRIPE_PRICE_${tier}_${intervalKey}` as keyof typeof serverEnv
  const priceId = serverEnv[key]
  return typeof priceId === 'string' && priceId.length > 0 ? priceId : null
}

/**
 * Get tier from Stripe Price ID (reverse lookup)
 * @param priceId Stripe Price ID
 * @returns Tier (T1, T2, T3) or null if not found
 */
export function getTierFromPriceId(priceId: string): string | null {
  // This function should only be called server-side
  if (typeof window !== 'undefined') {
    return null
  }
  
  const serverEnv = getEnv()
  if (!serverEnv) {
    return null
  }
  
  const tiers = ['T1', 'T2', 'T3'] as const
  const intervals = ['MONTHLY', '3MONTH', '6MONTH', 'ANNUAL'] as const
  
  for (const tier of tiers) {
    for (const interval of intervals) {
      const key = `STRIPE_PRICE_${tier}_${interval}` as keyof typeof serverEnv
      if (serverEnv[key] === priceId) {
        return tier
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

