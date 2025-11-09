import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { stripe, getPriceId, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET: Get subscription details
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
    
    if (!membership?.stripeSubscriptionId) {
      return NextResponse.json({
        subscription: null,
        membership: membership,
      })
    }
    
    // Check if Stripe is configured before calling Stripe API
    if (!isStripeConfigured()) {
      return NextResponse.json({
        subscription: null,
        membership: membership,
        error: 'Payment processing is not configured',
      })
    }
    
    // Get subscription from Stripe
    const subscription = await stripe!.subscriptions.retrieve(
      membership.stripeSubscriptionId
    )
    
    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        tier: membership.tier,
      },
      membership: membership,
    })
  } catch (error) {
    logger.error(
      'Get subscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

// POST: Update subscription
export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      )
    }

    const user = await requireUser()
    const body = await req.json()
    const { action, tier, interval } = body
    
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
    })
    
    if (!membership?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 400 }
      )
    }
    
    if (!stripe) {
      throw new Error('Stripe client not initialized')
    }
    
    const subscription = await stripe.subscriptions.retrieve(
      membership.stripeSubscriptionId
    )
    
    switch (action) {
      case 'cancel':
        // Cancel at period end
        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
        })
        break
      
      case 'reactivate':
        // Reactivate subscription
        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: false,
        })
        break
      
      case 'change_plan':
        // Change subscription plan
        if (!tier || !interval) {
          return NextResponse.json(
            { error: 'Missing tier or interval' },
            { status: 400 }
          )
        }
        
        const newPriceId = getPriceId(tier, interval as 'month' | '3month' | '6month' | 'year')
        if (!newPriceId) {
          return NextResponse.json(
            { error: 'Invalid tier or interval' },
            { status: 400 }
          )
        }
        
        await stripe.subscriptions.update(subscription.id, {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'always_invoice', // Prorate immediately
        })
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    logger.info('Subscription updated', {
      userId: user.id,
      action,
      tier,
      interval,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(
      'Update subscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}

