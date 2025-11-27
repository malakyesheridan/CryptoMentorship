import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPriceId, isStripeConfigured } from '@/lib/stripe'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      )
    }

    // Map old tiers: T2→T1 (Growth), T3→T2 (Elite), T1→removed
    const tiers = ['T1', 'T2'] as const
    const intervals = ['month', '3month', '6month', 'year'] as const
    const prices: Record<string, Record<string, { amount: number; currency: string; formatted: string }>> = {}

    for (const tier of tiers) {
      prices[tier] = {}
      for (const interval of intervals) {
        const priceId = getPriceId(tier, interval)
        if (priceId) {
          try {
            const price = await stripe.prices.retrieve(priceId)
            const amount = price.unit_amount ? price.unit_amount / 100 : 0
            const currency = price.currency.toUpperCase()
            
            // Format currency based on currency code
            const formatted = new Intl.NumberFormat('en-AU', {
              style: 'currency',
              currency: currency === 'AUD' ? 'AUD' : 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(amount)

            prices[tier][interval] = {
              amount,
              currency,
              formatted,
            }
          } catch (error) {
            logger.error(
              `Failed to retrieve price ${priceId}`,
              error instanceof Error ? error : new Error(String(error))
            )
          }
        }
      }
    }

    return NextResponse.json({ prices })
  } catch (error) {
    logger.error(
      'Error fetching prices',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}

