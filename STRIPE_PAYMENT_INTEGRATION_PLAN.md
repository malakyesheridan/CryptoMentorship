# 💳 Stripe Payment Gateway Integration Plan

**Date:** December 2024  
**Status:** 📋 **PLANNING**  
**Goal:** Secure, production-ready Stripe subscription integration

---

## 📊 Overview

This plan implements a complete Stripe payment gateway with:
- Subscription management (T1, T2, T3 tiers)
- Secure checkout flow
- Webhook event handling
- Automatic membership sync
- Payment history
- Subscription management UI

**Estimated Time:** 3-4 days  
**Dependencies:** Authentication must be fixed first (Phase 1-2)

---

## 🎯 Requirements

### Business Requirements
- Three subscription tiers: T1 ($X/month), T2 ($Y/month), T3 ($Z/month)
- Recurring subscriptions (monthly/annual)
- Free trial support
- Automatic tier upgrades/downgrades
- Payment failure handling
- Subscription cancellation
- Payment history for users

### Technical Requirements
- Secure API key storage
- Webhook signature verification
- Idempotency (prevent duplicate processing)
- Database transactions for consistency
- Audit logging for all payment events
- Error handling and retries

---

## 🏗️ Architecture Design

### Stripe Integration Pattern

```
User Flow:
1. User selects subscription tier
2. Create Stripe Checkout Session
3. Redirect to Stripe Checkout
4. User completes payment
5. Stripe webhook → Update membership
6. User redirected back to app

Webhook Flow:
1. Stripe sends webhook event
2. Verify signature
3. Check idempotency (prevent duplicates)
4. Process event (update membership)
5. Log audit event
6. Return 200 OK
```

### Database Schema Changes Needed

```prisma
model Membership {
  id                String   @id @default(cuid())
  userId            String
  tier              String   // T1, T2, T3
  status            String   @default("trial") // trial, active, cancelled, past_due
  
  // Stripe integration fields
  stripeCustomerId  String?  @unique
  stripeSubscriptionId String? @unique
  stripePriceId     String?  // Stripe Price ID
  stripeProductId   String?  // Stripe Product ID
  
  // Payment tracking
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean @default(false)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
  @@index([status])
}

model Payment {
  id                String   @id @default(cuid())
  userId            String
  membershipId      String?
  
  // Stripe fields
  stripePaymentId   String   @unique // payment_intent ID
  stripeChargeId    String?  @unique
  amount            Decimal
  currency          String   @default("usd")
  status            String   // succeeded, pending, failed, refunded
  
  // Metadata
  description       String?
  billingPeriodStart DateTime?
  billingPeriodEnd   DateTime?
  
  createdAt         DateTime @default(now())

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  membership Membership? @relation(fields: [membershipId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([stripePaymentId])
  @@index([status])
  @@index([createdAt])
}

model WebhookEvent {
  id                String   @id @default(cuid())
  stripeEventId     String   @unique
  type              String   // event type
  processed         Boolean  @default(false)
  processedAt       DateTime?
  error             String?
  payload           String   // JSON string of full event
  createdAt         DateTime @default(now())

  @@index([stripeEventId])
  @@index([type])
  @@index([processed])
  @@index([createdAt])
}
```

---

## 📋 Implementation Plan

### **PHASE 1: Database Schema & Setup** (Day 1 Morning)

#### Step 1.1: Update Prisma Schema
**Files:** `prisma/schema.prisma`  
**Time:** 1 hour

**Tasks:**
1. Add Stripe fields to `Membership` model
2. Create `Payment` model
3. Create `WebhookEvent` model for idempotency
4. Add indexes for performance
5. Run migration

**Implementation:**
```prisma
// Add to Membership model:
stripeCustomerId      String?  @unique
stripeSubscriptionId String?  @unique
stripePriceId         String?
stripeProductId       String?
currentPeriodStart    DateTime?
currentPeriodEnd      DateTime?
cancelAtPeriodEnd     Boolean @default(false)

// Add indexes:
@@index([stripeCustomerId])
@@index([stripeSubscriptionId])

// New Payment model (see above)
// New WebhookEvent model (see above)
```

**Verification:**
- [ ] Schema updated
- [ ] Migration successful
- [ ] Indexes created

---

#### Step 1.2: Install Stripe SDK
**Files:** `package.json`  
**Time:** 15 minutes

**Installation:**
```bash
npm install stripe
npm install --save-dev @types/node
```

**Verification:**
- [ ] Stripe SDK installed
- [ ] TypeScript types available

---

#### Step 1.3: Configure Stripe Environment Variables
**Files:** `.env.example`, `src/lib/env.ts`  
**Time:** 30 minutes

**Environment Variables:**
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Test key for development
STRIPE_PUBLISHABLE_KEY=pk_test_... # Public key for frontend
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret

# Stripe Product/Price IDs (created in Stripe Dashboard)
STRIPE_PRICE_T1=price_... # T1 tier price ID
STRIPE_PRICE_T2=price_... # T2 tier price ID
STRIPE_PRICE_T3=price_... # T3 tier price ID
```

**Update env validation:**
```typescript
// src/lib/env.ts
const envSchema = z.object({
  // ... existing fields ...
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRICE_T1: z.string().startsWith('price_'),
  STRIPE_PRICE_T2: z.string().startsWith('price_'),
  STRIPE_PRICE_T3: z.string().startsWith('price_'),
})
```

**Verification:**
- [ ] Environment variables documented
- [ ] Validation added
- [ ] Types defined

---

### **PHASE 2: Stripe Service Layer** (Day 1 Afternoon)

#### Step 2.1: Create Stripe Client Utility
**Files:** New `src/lib/stripe/client.ts`  
**Time:** 30 minutes

**Implementation:**
```typescript
// src/lib/stripe/client.ts
import Stripe from 'stripe'
import { env } from '@/lib/env'

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia', // Latest API version
  typescript: true,
})

// Stripe configuration
export const STRIPE_CONFIG = {
  prices: {
    T1: env.STRIPE_PRICE_T1,
    T2: env.STRIPE_PRICE_T2,
    T3: env.STRIPE_PRICE_T3,
  },
  currency: 'usd',
  successUrl: `${env.NEXTAUTH_URL}/account?success=true`,
  cancelUrl: `${env.NEXTAUTH_URL}/account?canceled=true`,
} as const
```

**Verification:**
- [ ] Stripe client created
- [ ] Configuration centralized
- [ ] Type-safe

---

#### Step 2.2: Create Customer Management Service
**Files:** New `src/lib/stripe/customers.ts`  
**Time:** 1 hour

**Implementation:**
```typescript
// src/lib/stripe/customers.ts
import { stripe } from './client'
import { prisma } from '@/lib/prisma'

/**
 * Get or create Stripe customer for user
 */
export async function getOrCreateCustomer(userId: string, email: string, name?: string) {
  // Check if customer already exists
  const membership = await prisma.membership.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })

  if (membership?.stripeCustomerId) {
    // Verify customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(membership.stripeCustomerId)
      if (customer && !customer.deleted) {
        return customer as Stripe.Customer
      }
    } catch {
      // Customer doesn't exist in Stripe, create new one
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  })

  // Update membership with customer ID
  await prisma.membership.update({
    where: { userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer
}

/**
 * Update customer information
 */
export async function updateCustomer(customerId: string, data: {
  email?: string
  name?: string
  metadata?: Record<string, string>
}) {
  return await stripe.customers.update(customerId, data)
}
```

**Verification:**
- [ ] Customer creation works
- [ ] Existing customers retrieved
- [ ] Database sync works

---

#### Step 2.3: Create Subscription Service
**Files:** New `src/lib/stripe/subscriptions.ts`  
**Time:** 2 hours

**Implementation:**
```typescript
// src/lib/stripe/subscriptions.ts
import { stripe } from './client'
import { STRIPE_CONFIG } from './client'
import { getOrCreateCustomer } from './customers'
import { prisma } from '@/lib/prisma'
import { Decimal } from 'decimal.js'

export type SubscriptionTier = 'T1' | 'T2' | 'T3'

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  userName: string | null,
  tier: SubscriptionTier
) {
  // Get or create Stripe customer
  const customer = await getOrCreateCustomer(userId, userEmail, userName || undefined)

  // Get price ID for tier
  const priceId = STRIPE_CONFIG.prices[tier]
  if (!priceId) {
    throw new Error(`Invalid tier: ${tier}`)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${STRIPE_CONFIG.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: STRIPE_CONFIG.cancelUrl,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
    allow_promotion_codes: true,
  })

  return session
}

/**
 * Update membership from Stripe subscription
 */
export async function updateMembershipFromSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  // Determine tier from price ID
  const priceId = subscription.items.data[0]?.price.id
  let tier: SubscriptionTier = 'T1'
  
  if (priceId === STRIPE_CONFIG.prices.T3) tier = 'T3'
  else if (priceId === STRIPE_CONFIG.prices.T2) tier = 'T2'
  else if (priceId === STRIPE_CONFIG.prices.T1) tier = 'T1'

  // Determine status
  let status = 'active'
  if (subscription.status === 'active') status = 'active'
  else if (subscription.status === 'trialing') status = 'trial'
  else if (subscription.status === 'canceled' || subscription.status === 'unpaid') status = 'cancelled'
  else if (subscription.status === 'past_due') status = 'past_due'
  else status = 'paused'

  // Update membership
  const membership = await prisma.membership.upsert({
    where: { userId },
    update: {
      tier,
      status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeProductId: subscription.items.data[0]?.price.product as string,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      userId,
      tier,
      status,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeProductId: subscription.items.data[0]?.price.product as string,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  return membership
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string, cancelImmediately = false) {
  const membership = await prisma.membership.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true },
  })

  if (!membership?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  if (cancelImmediately) {
    // Cancel immediately
    await stripe.subscriptions.cancel(membership.stripeSubscriptionId)
    
    await prisma.membership.update({
      where: { userId },
      data: {
        status: 'cancelled',
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
      },
    })
  } else {
    // Cancel at period end
    await stripe.subscriptions.update(membership.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
    
    await prisma.membership.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
      },
    })
  }
}

/**
 * Update subscription tier
 */
export async function changeSubscriptionTier(userId: string, newTier: SubscriptionTier) {
  const membership = await prisma.membership.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true, stripeCustomerId: true },
  })

  if (!membership?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  const subscription = await stripe.subscriptions.retrieve(membership.stripeSubscriptionId)
  const priceId = STRIPE_CONFIG.prices[newTier]

  // Update subscription with new price
  await stripe.subscriptions.update(membership.stripeSubscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: priceId,
    }],
    proration_behavior: 'always_invoice', // Prorate immediately
    metadata: {
      ...subscription.metadata,
      tier: newTier,
    },
  })

  // Sync to database (webhook will handle this, but we can also update directly)
  await updateMembershipFromSubscription(userId, await stripe.subscriptions.retrieve(membership.stripeSubscriptionId))
}
```

**Verification:**
- [ ] Checkout session creation works
- [ ] Membership updates correctly
- [ ] Cancellation works
- [ ] Tier changes work

---

#### Step 2.4: Create Payment Service
**Files:** New `src/lib/stripe/payments.ts`  
**Time:** 1 hour

**Implementation:**
```typescript
// src/lib/stripe/payments.ts
import { stripe } from './client'
import { prisma } from '@/lib/prisma'
import { Decimal } from 'decimal.js'

/**
 * Record payment in database
 */
export async function recordPayment(
  paymentIntentId: string,
  chargeId: string | null,
  userId: string,
  membershipId: string | null,
  amount: number,
  currency: string,
  status: string,
  description?: string
) {
  // Check if already recorded (idempotency)
  const existing = await prisma.payment.findUnique({
    where: { stripePaymentId: paymentIntentId },
  })

  if (existing) {
    return existing
  }

  // Record payment
  const payment = await prisma.payment.create({
    data: {
      userId,
      membershipId,
      stripePaymentId: paymentIntentId,
      stripeChargeId: chargeId,
      amount: new Decimal(amount),
      currency,
      status,
      description,
      createdAt: new Date(),
    },
  })

  return payment
}

/**
 * Get user payment history
 */
export async function getUserPayments(userId: string, limit = 10) {
  return await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      membership: {
        select: {
          tier: true,
          status: true,
        },
      },
    },
  })
}
```

**Verification:**
- [ ] Payment recording works
- [ ] Idempotency prevents duplicates
- [ ] Payment history retrieval works

---

### **PHASE 3: API Endpoints** (Day 2 Morning)

#### Step 3.1: Create Checkout Session Endpoint
**Files:** New `app/api/stripe/checkout/route.ts`  
**Time:** 1 hour

**Implementation:**
```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { createCheckoutSession } from '@/lib/stripe/subscriptions'
import { z } from 'zod'

const checkoutSchema = z.object({
  tier: z.enum(['T1', 'T2', 'T3']),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    
    const body = await request.json()
    const { tier } = checkoutSchema.parse(body)

    // Create checkout session
    const session = await createCheckoutSession(
      user.id,
      user.email!,
      user.name || null,
      tier
    )

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
```

**Verification:**
- [ ] Endpoint requires authentication
- [ ] Checkout session created
- [ ] Returns session URL

---

#### Step 3.2: Create Subscription Management Endpoints
**Files:** New `app/api/stripe/subscription/route.ts`  
**Time:** 1.5 hours

**Implementation:**
```typescript
// app/api/stripe/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { cancelSubscription, changeSubscriptionTier } from '@/lib/stripe/subscriptions'
import { z } from 'zod'

const cancelSchema = z.object({
  cancelImmediately: z.boolean().default(false),
})

const changeTierSchema = z.object({
  tier: z.enum(['T1', 'T2', 'T3']),
})

// GET - Get current subscription
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    
    const membership = await prisma.membership.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    return NextResponse.json(membership)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { cancelImmediately } = cancelSchema.parse(body)

    await cancelSubscription(user.id, cancelImmediately)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

// PUT - Change subscription tier
export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { tier } = changeTierSchema.parse(body)

    await changeSubscriptionTier(user.id, tier)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to change subscription' },
      { status: 500 }
    )
  }
}
```

**Verification:**
- [ ] Get subscription works
- [ ] Cancel subscription works
- [ ] Change tier works
- [ ] All require authentication

---

#### Step 3.3: Create Payment History Endpoint
**Files:** New `app/api/stripe/payments/route.ts`  
**Time:** 30 minutes

**Implementation:**
```typescript
// app/api/stripe/payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { getUserPayments } from '@/lib/stripe/payments'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const payments = await getUserPayments(user.id, limit)

    return NextResponse.json({ payments })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get payments' },
      { status: 500 }
    )
  }
}
```

**Verification:**
- [ ] Payment history retrieved
- [ ] Pagination works
- [ ] Requires authentication

---

#### Step 3.4: Create Webhook Endpoint
**Files:** New `app/api/webhooks/stripe/route.ts`  
**Time:** 3 hours (most critical)

**Implementation:**
```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { updateMembershipFromSubscription } from '@/lib/stripe/subscriptions'
import { recordPayment } from '@/lib/stripe/payments'
import { logAudit } from '@/lib/audit'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(
  request: NextRequest
): Promise<Stripe.Event | null> {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return null
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return null
  }
}

/**
 * Handle webhook event (idempotent)
 */
async function handleWebhookEvent(event: Stripe.Event) {
  // Check if already processed
  const existing = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  })

  if (existing?.processed) {
    console.log(`Event ${event.id} already processed`)
    return { success: true, skipped: true }
  }

  // Record event
  await prisma.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    update: {},
    create: {
      stripeEventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      processed: false,
    },
  })

  try {
    // Process event
    let result: { success: boolean; data?: any }

    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        result = await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        result = await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        result = await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        result = { success: true, skipped: true }
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })

    return result
  } catch (error) {
    // Mark as failed
    await prisma.webhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })
    throw error
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) {
    throw new Error('Missing userId in session metadata')
  }

  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  await updateMembershipFromSubscription(userId, subscription)

  // Audit log
  await logAudit(
    prisma,
    userId,
    'create',
    'subscription',
    subscriptionId,
    { tier: subscription.metadata?.tier }
  )

  return { success: true }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    // Try to find user by customer ID
    const membership = await prisma.membership.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
      select: { userId: true },
    })
    if (!membership) throw new Error('Cannot find user for subscription')
    await updateMembershipFromSubscription(membership.userId, subscription)
  } else {
    await updateMembershipFromSubscription(userId, subscription)
  }

  return { success: true }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    const membership = await prisma.membership.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
      select: { userId: true },
    })
    if (!membership) throw new Error('Cannot find user for subscription')
    
    await prisma.membership.update({
      where: { userId: membership.userId },
      data: {
        status: 'cancelled',
        cancelAtPeriodEnd: false,
      },
    })
  } else {
    await prisma.membership.update({
      where: { userId },
      data: {
        status: 'cancelled',
        cancelAtPeriodEnd: false,
      },
    })
  }

  return { success: true }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
  const userId = subscription.metadata?.userId

  if (!userId) {
    const membership = await prisma.membership.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true, id: true },
    })
    if (!membership) throw new Error('Cannot find membership')
    
    await recordPayment(
      invoice.payment_intent as string,
      invoice.charge as string,
      membership.userId,
      membership.id,
      invoice.amount_paid,
      invoice.currency,
      'succeeded',
      `Subscription payment for ${invoice.period_start}-${invoice.period_end}`
    )
  } else {
    const membership = await prisma.membership.findUnique({
      where: { userId },
      select: { id: true },
    })
    
    await recordPayment(
      invoice.payment_intent as string,
      invoice.charge as string,
      userId,
      membership?.id || null,
      invoice.amount_paid,
      invoice.currency,
      'succeeded',
      `Subscription payment`
    )
  }

  return { success: true }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  const membership = await prisma.membership.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { userId: true, id: true },
  })

  if (membership) {
    await prisma.membership.update({
      where: { userId: membership.userId },
      data: {
        status: 'past_due',
      },
    })
  }

  return { success: true }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const event = await verifyWebhookSignature(request)
    
    if (!event) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Process event (idempotent)
    const result = await handleWebhookEvent(event)

    return NextResponse.json({ received: true, result })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
```

**Verification:**
- [ ] Webhook signature verified
- [ ] Events processed idempotently
- [ ] Membership updated correctly
- [ ] Payments recorded
- [ ] Error handling works

---

### **PHASE 4: Frontend Implementation** (Day 2 Afternoon - Day 3)

#### Step 4.1: Create Subscription Selection Component
**Files:** New `src/components/payments/SubscriptionTiers.tsx`  
**Time:** 2 hours

**Implementation:**
```typescript
// src/components/payments/SubscriptionTiers.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Tier {
  id: 'T1' | 'T2' | 'T3'
  name: string
  price: string
  features: string[]
  popular?: boolean
}

const tiers: Tier[] = [
  {
    id: 'T1',
    name: 'Basic',
    price: '$29',
    features: [
      'Access to basic content',
      'Community access',
      'Weekly updates',
    ],
  },
  {
    id: 'T2',
    name: 'Premium',
    price: '$79',
    features: [
      'Everything in Basic',
      'Advanced portfolio signals',
      'Priority support',
      'Exclusive content',
    ],
    popular: true,
  },
  {
    id: 'T3',
    name: 'Ultimate',
    price: '$199',
    features: [
      'Everything in Premium',
      '1-on-1 consultations',
      'Early access to signals',
      'Private community',
    ],
  },
]

export function SubscriptionTiers() {
  const [selectedTier, setSelectedTier] = useState<'T1' | 'T2' | 'T3' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubscribe = async (tierId: 'T1' | 'T2' | 'T3') => {
    setIsLoading(true)
    setSelectedTier(tierId)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to start checkout. Please try again.')
      setIsLoading(false)
      setSelectedTier(null)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {tiers.map((tier) => (
        <Card
          key={tier.id}
          className={`relative ${
            tier.popular ? 'border-yellow-500 border-2' : ''
          }`}
        >
          {tier.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{tier.name}</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold">{tier.price}</span>
              <span className="text-slate-500">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe(tier.id)}
              disabled={isLoading}
              className={`w-full ${
                tier.popular
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
              size="lg"
            >
              {isLoading && selectedTier === tier.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe'
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Verification:**
- [ ] Tiers displayed correctly
- [ ] Checkout session created
- [ ] Redirect to Stripe works

---

#### Step 4.2: Create Subscription Management Page
**Files:** New `app/(app)/account/subscription/page.tsx`  
**Time:** 2 hours

**Implementation:**
```typescript
// app/(app)/account/subscription/page.tsx
import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { SubscriptionManagement } from '@/components/payments/SubscriptionManagement'

export default async function SubscriptionPage() {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
      <SubscriptionManagement userId={session.user.id} />
    </div>
  )
}
```

**Client Component:**
```typescript
// src/components/payments/SubscriptionManagement.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Membership {
  id: string
  tier: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId: string | null
}

export function SubscriptionManagement({ userId }: { userId: string }) {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)

  useEffect(() => {
    fetchMembership()
  }, [userId])

  const fetchMembership = async () => {
    try {
      const response = await fetch('/api/stripe/subscription')
      if (response.ok) {
        const data = await response.json()
        setMembership(data)
      }
    } catch (error) {
      console.error('Error fetching membership:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async (cancelImmediately = false) => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return
    }

    setIsCanceling(true)
    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelImmediately }),
      })

      if (response.ok) {
        await fetchMembership() // Refresh
        alert('Subscription cancelled successfully')
      } else {
        throw new Error('Failed to cancel')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Failed to cancel subscription')
    } finally {
      setIsCanceling(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
  }

  if (!membership) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-slate-600 mb-4">No active subscription</p>
          <Button onClick={() => window.location.href = '/account/subscription/upgrade'}>
            Choose a Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">Current Plan</h3>
            <p className="text-2xl font-bold text-yellow-500">{membership.tier}</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg">Status</h3>
            <div className="flex items-center gap-2">
              {membership.status === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="capitalize">{membership.status}</span>
            </div>
          </div>

          {membership.currentPeriodEnd && (
            <div>
              <h3 className="font-semibold text-lg">Next Billing Date</h3>
              <p>{new Date(membership.currentPeriodEnd).toLocaleDateString()}</p>
            </div>
          )}

          {membership.cancelAtPeriodEnd && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Your subscription will cancel at the end of the current period.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {!membership.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                onClick={() => handleCancel(false)}
                disabled={isCanceling}
              >
                Cancel at Period End
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => handleCancel(true)}
              disabled={isCanceling}
            >
              Cancel Immediately
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Verification:**
- [ ] Subscription displayed
- [ ] Cancellation works
- [ ] Status updates correctly

---

#### Step 4.3: Create Payment History Component
**Files:** New `src/components/payments/PaymentHistory.tsx`  
**Time:** 1 hour

**Implementation:**
```typescript
// src/components/payments/PaymentHistory.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/dates'

interface Payment {
  id: string
  amount: string
  currency: string
  status: string
  description: string | null
  createdAt: string
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/stripe/payments?limit=20')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-slate-600">No payments found</p>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-medium">{payment.description || 'Subscription Payment'}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(new Date(payment.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${parseFloat(payment.amount).toFixed(2)} {payment.currency.toUpperCase()}
                  </p>
                  <p className={`text-sm ${
                    payment.status === 'succeeded' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {payment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Verification:**
- [ ] Payment history displayed
- [ ] Formatting correct
- [ ] Status colors work

---

#### Step 4.4: Integrate into Account Page
**Files:** `app/(app)/account/page.tsx`  
**Time:** 30 minutes

**Tasks:**
1. Add subscription management section
2. Add payment history section
3. Add upgrade button if no subscription

**Verification:**
- [ ] All sections visible
- [ ] Navigation works
- [ ] Responsive design

---

### **PHASE 5: Stripe Dashboard Setup** (Day 3)

#### Step 5.1: Create Products and Prices in Stripe
**Time:** 30 minutes  
**Location:** Stripe Dashboard

**Tasks:**
1. Create three products: T1, T2, T3
2. Create monthly recurring prices for each
3. Copy Price IDs to environment variables
4. Configure webhook endpoint in Stripe Dashboard

**Steps:**
1. Go to Stripe Dashboard → Products
2. Create Product "T1 Subscription"
3. Add Price: $29/month, recurring
4. Copy Price ID → Set as `STRIPE_PRICE_T1`
5. Repeat for T2 ($79) and T3 ($199)
6. Go to Developers → Webhooks
7. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
8. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
9. Copy webhook signing secret → Set as `STRIPE_WEBHOOK_SECRET`

**Verification:**
- [ ] All products created
- [ ] Prices configured
- [ ] Webhook endpoint added
- [ ] Events selected
- [ ] Signing secret copied

---

#### Step 5.2: Test Mode Setup
**Time:** 30 minutes

**Tasks:**
1. Use test API keys (starts with `sk_test_`, `pk_test_`)
2. Test checkout flow
3. Test webhook events using Stripe CLI
4. Verify database updates

**Stripe CLI Testing:**
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local server
stripe listen --forward-to http://localhost:5001/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

**Verification:**
- [ ] Test checkout works
- [ ] Webhooks received
- [ ] Database updates correctly

---

### **PHASE 6: Security & Testing** (Day 4)

#### Step 6.1: Security Hardening
**Time:** 2 hours

**Tasks:**
1. Verify webhook signature in all cases
2. Add rate limiting to webhook endpoint
3. Add audit logging for all payment operations
4. Validate all inputs
5. Add error handling

**Implementation:**
```typescript
// Add to webhook endpoint:
// Rate limiting (prevent abuse)
const rateLimit = await checkRateLimit(`webhook:${event.id}`, 1, 60000) // 1 per minute per event
if (!rateLimit.allowed) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
}

// Input validation
if (!event.type || !event.id) {
  return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
}
```

**Verification:**
- [ ] All security measures in place
- [ ] Rate limiting works
- [ ] Audit logs created

---

#### Step 6.2: Error Handling & Edge Cases
**Time:** 2 hours

**Scenarios to Handle:**
1. Payment succeeds but webhook fails → Manual sync endpoint
2. Duplicate webhook events → Idempotency check
3. Subscription cancelled but still active → Grace period handling
4. Tier change during billing cycle → Proration
5. Payment method update → Handle via webhook

**Implementation:**
```typescript
// Manual sync endpoint (for edge cases)
// app/api/stripe/sync/route.ts
export async function POST(request: NextRequest) {
  const user = await requireUser()
  
  // Sync subscription from Stripe
  const membership = await prisma.membership.findUnique({
    where: { userId: user.id },
    select: { stripeSubscriptionId: true },
  })
  
  if (!membership?.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No subscription' }, { status: 404 })
  }
  
  const subscription = await stripe.subscriptions.retrieve(
    membership.stripeSubscriptionId
  )
  
  await updateMembershipFromSubscription(user.id, subscription)
  
  return NextResponse.json({ success: true })
}
```

**Verification:**
- [ ] Edge cases handled
- [ ] Manual sync works
- [ ] Error messages clear

---

#### Step 6.3: Integration Testing
**Time:** 3 hours

**Test Scenarios:**
1. ✅ User subscribes to T1 → Membership created
2. ✅ User upgrades to T2 → Tier updated, prorated
3. ✅ User cancels → Status updated
4. ✅ Payment succeeds → Payment recorded
5. ✅ Payment fails → Status set to past_due
6. ✅ Webhook replay → Idempotency prevents duplicate
7. ✅ User without subscription → Error handled
8. ✅ Invalid webhook signature → Rejected

**Verification:**
- [ ] All scenarios tested
- [ ] No regressions
- [ ] Error handling works

---

## ✅ Testing Checklist

### Stripe Integration
- [ ] Checkout session creates successfully
- [ ] Redirect to Stripe works
- [ ] Payment completes
- [ ] Webhook received and verified
- [ ] Membership updated correctly
- [ ] Payment recorded in database
- [ ] Subscription cancellation works
- [ ] Tier upgrade works with proration
- [ ] Payment failure handled
- [ ] Webhook idempotency works

### Security
- [ ] Webhook signature verified
- [ ] API keys stored securely
- [ ] No sensitive data in logs
- [ ] Rate limiting active
- [ ] Authentication required
- [ ] Audit logs created

### UI/UX
- [ ] Tier selection clear
- [ ] Checkout flow smooth
- [ ] Subscription management intuitive
- [ ] Payment history accurate
- [ ] Error messages helpful

---

## 📝 Environment Variables Summary

```bash
# Stripe API Keys (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_... # Test mode
STRIPE_PUBLISHABLE_KEY=pk_test_... # Public key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret

# Stripe Price IDs (created in Stripe Dashboard)
STRIPE_PRICE_T1=price_...
STRIPE_PRICE_T2=price_...
STRIPE_PRICE_T3=price_...
```

---

## 🚨 Security Considerations

### PCI Compliance
- ✅ Never store card details
- ✅ Use Stripe Checkout (hosted, PCI compliant)
- ✅ Don't handle raw card data
- ✅ Use HTTPS everywhere

### Webhook Security
- ✅ Always verify signature
- ✅ Use HTTPS endpoint
- ✅ Implement idempotency
- ✅ Rate limit webhook endpoint
- ✅ Log all webhook events

### API Key Security
- ✅ Store keys in environment variables
- ✅ Never commit to repository
- ✅ Use test keys in development
- ✅ Rotate keys if exposed

---

## 📅 Timeline

### Day 1: Setup & Backend
- Morning: Database schema, Stripe SDK
- Afternoon: Service layer (customers, subscriptions, payments)

### Day 2: API Endpoints
- Morning: Checkout, subscription management APIs
- Afternoon: Webhook endpoint (most critical)

### Day 3: Frontend
- Morning: Subscription tiers component
- Afternoon: Management page, payment history

### Day 4: Testing & Security
- Morning: Stripe dashboard setup
- Afternoon: Testing, error handling, security hardening

---

## 🔄 Dependencies

### Must Complete First:
1. ✅ Authentication fixed (Phase 1-2 from auth plan)
2. ✅ Input sanitization (XSS protection)
3. ✅ Environment variable validation
4. ✅ Remove sensitive logs

### Can Parallel:
- TypeScript error fixes
- UI polish

---

## 📚 Resources

- [Stripe Docs - Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Docs - Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Docs - Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

**Status:** 📋 Ready for Implementation  
**Dependencies:** Authentication must be fixed first  
**Next Step:** Complete Phase 1-2 of auth plan, then begin Stripe integration

