import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { createCommissionIfReferred } from '@/lib/referrals'
import { markReferralQualifiedFromPayment, markReferralTrial, voidReferralIfInHold } from '@/lib/affiliate'
import { onTrialStarted } from '@/lib/membership/trial'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!isStripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    logger.warn('Webhook endpoint called but Stripe is not configured')
    return NextResponse.json(
      { error: 'Webhook endpoint not configured' },
      { status: 503 }
    )
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }
  
  let event: Stripe.Event
  
  try {
    if (!stripe) {
      throw new Error('Stripe client not initialized')
    }
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    logger.error(
      'Webhook signature verification failed',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  // Check if event already processed (idempotency)
  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  })
  
  if (existingEvent?.processed) {
    logger.info('Webhook event already processed', { eventId: event.id })
    return NextResponse.json({ received: true })
  }
  
  // Store event
  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      eventType: event.type,
      payload: JSON.stringify(event.data.object),
      processed: false,
    },
  })
  
  try {
    // Process event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      
      default:
        logger.info('Unhandled webhook event', { type: event.type })
    }
    
    // Mark event as processed
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })
    
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error(
      'Webhook processing error',
      error instanceof Error ? error : new Error(String(error)),
      {
        eventId: event.id,
        eventType: event.type,
      }
    )
    
    // Mark event as failed
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier
  
  if (!userId || !tier) {
    throw new Error('Missing userId or tier in session metadata')
  }
  
  // Update membership with subscription details
  if (session.subscription && stripe) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    )
    
    await prisma.membership.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id || null,
        tier: tier as any,
        status: 'active',
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        userId,
        tier: tier as any,
        status: 'active',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id || null,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (!stripe) {
    throw new Error('Stripe client not initialized')
  }
  
  const customerId = subscription.customer as string
  const membership = await prisma.membership.findFirst({
    where: { stripeCustomerId: customerId },
  })
  
  if (!membership) {
    throw new Error(`Membership not found for customer ${customerId}`)
  }
  
  const membershipStatus = subscription.status === 'trialing'
    ? 'trial'
    : subscription.status === 'active'
    ? 'active'
    : 'inactive'

  const updatedMembership = await prisma.membership.update({
    where: { id: membership.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id || null,
      status: membershipStatus,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  if (membershipStatus === 'trial') {
    const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000) : new Date()
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    await markReferralTrial({
      userId: updatedMembership.userId,
      trialStartedAt: trialStart,
      trialEndsAt: trialEnd
    })

    if (trialEnd) {
      try {
        await onTrialStarted({
          userId: updatedMembership.userId,
          membership: {
            status: updatedMembership.status,
            currentPeriodStart: updatedMembership.currentPeriodStart,
            currentPeriodEnd: updatedMembership.currentPeriodEnd,
            tier: updatedMembership.tier,
          },
          source: 'stripe-trial',
        })
      } catch (error) {
        logger.error(
          'Failed to enqueue trial welcome email from Stripe trial',
          error instanceof Error ? error : new Error(String(error)),
          { userId: updatedMembership.userId }
        )
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const membership = await prisma.membership.findFirst({
    where: { stripeCustomerId: customerId },
  })
  
  if (!membership) {
    throw new Error(`Membership not found for customer ${customerId}`)
  }
  
  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      stripeSubscriptionId: null,
      status: 'inactive',
      cancelAtPeriodEnd: false,
    },
  })

  await voidReferralIfInHold({
    userId: membership.userId,
    occurredAt: new Date(),
    reason: 'subscription_deleted'
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const membership = await prisma.membership.findFirst({
    where: { stripeCustomerId: customerId },
  })
  
  if (!membership) {
    throw new Error(`Membership not found for customer ${customerId}`)
  }
  
  // Determine if this is an initial payment or recurring payment
  // Stripe sets billing_reason to 'subscription_create' for initial payments
  const isInitial = invoice.billing_reason === 'subscription_create'
  
  // Get tier from membership (default to T1 if not set)
  const tier = (membership.tier as 'T1' | 'T2') || 'T1'
  
  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      userId: membership.userId,
      membershipId: membership.id,
      stripePaymentId: (invoice as any).payment_intent as string,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency || 'usd',
      status: 'succeeded',
      paymentMethod: ((invoice as any).payment_method_types?.[0] || 'card') as string,
      description: invoice.description || undefined,
      metadata: JSON.stringify({
        ...invoice.metadata,
        billing_reason: invoice.billing_reason,
        isInitial,
        tier,
      }),
    },
  })
  
  // Update membership status
  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: 'active',
    },
  })

  // Create commission if user was referred (NON-BLOCKING: errors don't fail payment processing)
  try {
    const commissionResult = await createCommissionIfReferred(
      membership.userId,
      payment.id,
      invoice.amount_paid / 100,
      isInitial,
      tier
    )
    if (commissionResult.success) {
      logger.info('Commission created from payment', {
        commissionId: commissionResult.commissionId,
        userId: membership.userId,
        paymentId: payment.id,
        amount: invoice.amount_paid / 100,
        isInitial,
        tier,
        commissionRate: isInitial ? '25%' : '10%',
      })
    } else {
      // User wasn't referred - this is fine, not an error
      if (commissionResult.error !== 'User was not referred') {
        logger.warn('Commission creation failed (non-blocking)', {
          userId: membership.userId,
          paymentId: payment.id,
          error: commissionResult.error,
        })
      }
    }
  } catch (error) {
    // Log error but don't fail webhook - payment processing succeeded
    logger.error(
      'Commission creation error (non-blocking)',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: membership.userId,
        paymentId: payment.id,
        amount: invoice.amount_paid / 100,
        isInitial,
        tier,
      }
    )
  }

  await markReferralQualifiedFromPayment({
    userId: membership.userId,
    paidAt: new Date(),
    planPriceCents: invoice.amount_paid,
    currency: invoice.currency || 'usd',
    isInitial
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const membership = await prisma.membership.findFirst({
    where: { stripeCustomerId: customerId },
  })
  
  if (!membership) {
    throw new Error(`Membership not found for customer ${customerId}`)
  }
  
  // Create payment record
  await prisma.payment.create({
    data: {
      userId: membership.userId,
      membershipId: membership.id,
      stripePaymentId: (invoice as any).payment_intent as string,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due / 100, // Convert from cents
      currency: invoice.currency || 'usd',
      status: 'failed',
      paymentMethod: ((invoice as any).payment_method_types?.[0] || 'card') as string,
      description: invoice.description || undefined,
      metadata: invoice.metadata ? JSON.stringify(invoice.metadata) : null,
    },
  })
  
  // Update membership status (grace period - keep active for now)
  // Could implement grace period logic here
  // For now, we'll let Stripe handle retries and only mark inactive after subscription is canceled

}

