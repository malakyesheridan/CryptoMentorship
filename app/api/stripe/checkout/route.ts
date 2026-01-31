import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { stripe, getPriceId, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const checkoutSchema = z.object({
  tier: z.enum(['T1', 'T2']),
  interval: z.enum(['month', '3month', '6month', 'year']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export async function POST(req: NextRequest) {
  const requestContext: { userId?: string; tier?: string; interval?: string } = {}
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      )
    }

    const authSession = await getServerSession(authOptions)
    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    requestContext.userId = authSession.user.id
    const sessionUser = authSession.user
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true },
    })
    if (!dbUser) {
      return NextResponse.json(
        { error: 'Account not found. Please sign in again.' },
        { status: 401 }
      )
    }
    const user = dbUser
    const body = await req.json()
    const { tier, interval, successUrl, cancelUrl } = checkoutSchema.parse(body)
    requestContext.tier = tier
    requestContext.interval = interval
    
    // Get price ID
    const priceId = getPriceId(tier, interval)
    if (!priceId) {
      return NextResponse.json(
        { error: `Subscription plan not configured for ${tier} ${interval}` },
        { status: 400 }
      )
    }
    
    // Get or create Stripe customer
    let stripeCustomerId: string | null = null
    
    // Check if user already has a Stripe customer ID
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      select: { stripeCustomerId: true },
    })
    
    if (membership?.stripeCustomerId) {
      stripeCustomerId = membership.stripeCustomerId
    } else {
      // Create Stripe customer
      if (!stripe) {
        throw new Error('Stripe client not initialized')
      }
      
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      
      stripeCustomerId = customer.id
      
      // Update or create membership with Stripe customer ID
      await prisma.membership.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId: customer.id },
        create: {
          userId: user.id,
          tier: 'T2', // Default tier for trials, will be updated by webhook if different
          // Do not grant access until Stripe confirms subscription via webhook
          status: 'inactive',
          stripeCustomerId: customer.id,
        },
      })
    }
    
    // Create checkout session
    if (!stripe) {
      throw new Error('Stripe client not initialized')
    }
    
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        tier: tier,
        interval: interval,
      },
    })
    
    logger.info('Checkout session created', {
      userId: user.id,
      sessionId: checkoutSession.id,
      tier,
      interval,
    })
    
    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    logger.error(
      'Checkout session creation error',
      error instanceof Error ? error : new Error(String(error)),
      requestContext
    )
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    const stripeError = error as { type?: string; message?: string; statusCode?: number }
    if (stripeError?.type && stripeError?.message) {
      return NextResponse.json(
        { error: stripeError.message },
        { status: stripeError.statusCode || 400 }
      )
    }
    
    const isDebug = process.env.NODE_ENV !== 'production' || process.env.STRIPE_DEBUG === 'true'
    return NextResponse.json(
      { error: isDebug && error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

