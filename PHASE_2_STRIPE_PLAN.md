# Phase 2: Stripe Payment Gateway Integration Plan

**Date:** December 2024  
**Status:** 📋 **PLANNING**  
**Dependencies:** Phase 1 Complete ✅

---

## 🎯 **Phase 2 Overview**

Integrate Stripe payment gateway to enable:
- Subscription management (monthly/annual plans)
- Payment processing (one-time payments)
- Webhook handling for subscription events
- Customer portal integration
- Invoice generation and management
- Membership tier upgrades/downgrades

---

## 📋 **Objectives**

1. **Payment Processing**
   - Secure credit card processing via Stripe
   - Support for subscriptions (recurring payments)
   - Support for one-time payments
   - PCI compliance (Stripe handles PCI)

2. **Subscription Management**
   - Create subscription plans (T1, T2, T3 tiers)
   - Handle subscription lifecycle (create, update, cancel)
   - Manage subscription status (active, canceled, past_due)
   - Handle subscription renewals

3. **Webhook Integration**
   - Handle Stripe webhook events
   - Update membership status based on payments
   - Sync subscription state with database
   - Handle failed payments and cancellations

4. **Customer Portal**
   - Allow users to manage subscriptions
   - View billing history
   - Update payment methods
   - Cancel/reactivate subscriptions

5. **Membership Integration**
   - Sync Stripe subscriptions with Membership model
   - Handle tier upgrades/downgrades
   - Manage access based on subscription status
   - Handle grace periods for failed payments

---

## 🏗️ **Architecture Overview**

### **Database Schema Changes**

```prisma
model Membership {
  // ... existing fields ...
  stripeCustomerId      String?  // Stripe Customer ID
  stripeSubscriptionId String?  // Stripe Subscription ID
  stripePriceId         String?  // Stripe Price ID
  currentPeriodStart   DateTime? // Current billing period start
  currentPeriodEnd     DateTime? // Current billing period end
  cancelAtPeriodEnd    Boolean  @default(false) // Cancel at period end
  
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}

model Payment {
  id                  String   @id @default(cuid())
  userId              String
  membershipId        String?
  stripePaymentId     String   @unique // Stripe Payment Intent ID
  stripeInvoiceId     String?  // Stripe Invoice ID
  amount              Decimal
  currency            String   @default("usd")
  status              String   // succeeded, pending, failed, refunded
  paymentMethod       String?  // card, bank_transfer, etc.
  description         String?
  metadata            Json?    // Additional metadata
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  membership          Membership? @relation(fields: [membershipId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([membershipId])
  @@index([stripePaymentId])
  @@index([status])
  @@index([createdAt])
}

model StripeWebhookEvent {
  id              String   @id @default(cuid())
  stripeEventId   String   @unique // Stripe Event ID
  eventType       String   // payment_intent.succeeded, customer.subscription.updated, etc.
  processed       Boolean  @default(false)
  processedAt     DateTime?
  payload         Json     // Full event payload
  error           String?
  createdAt       DateTime @default(now())
  
  @@index([stripeEventId])
  @@index([eventType])
  @@index([processed])
  @@index([createdAt])
}
```

---

## 📦 **Dependencies**

### **Required Packages**
```json
{
  "stripe": "^14.0.0",
  "@stripe/stripe-js": "^2.4.0"
}
```

### **Environment Variables**
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (subscription plans)
STRIPE_PRICE_T1_MONTHLY=price_...
STRIPE_PRICE_T1_ANNUAL=price_...
STRIPE_PRICE_T2_MONTHLY=price_...
STRIPE_PRICE_T2_ANNUAL=price_...
STRIPE_PRICE_T3_MONTHLY=price_...
STRIPE_PRICE_T3_ANNUAL=price_...
```

---

## 🔄 **Phase 2 Implementation Plan**

### **PHASE 2.1: Stripe Setup & Configuration** ✅ **NON-BREAKING**

#### **2.1.1: Install Dependencies** ✅ **NON-BREAKING**
```bash
npm install stripe @stripe/stripe-js
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New dependencies only
- No existing code modified

---

#### **2.1.2: Create Stripe Utilities** ✅ **NON-BREAKING**

**File:** `src/lib/stripe.ts` (NEW)

**Features:**
- Initialize Stripe client (server-side)
- Initialize Stripe.js (client-side)
- Helper functions for Stripe operations

**Implementation:**
```typescript
import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'
import { env } from '@/lib/env'

// Server-side Stripe client
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Client-side Stripe.js (lazy-loaded)
let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

// Helper: Get price ID for tier and interval
export function getPriceId(tier: string, interval: 'month' | 'year'): string | null {
  const key = `STRIPE_PRICE_${tier}_${interval.toUpperCase()}` as keyof typeof env
  return env[key] || null
}

// Helper: Get tier from price ID
export function getTierFromPriceId(priceId: string): string | null {
  // Reverse lookup logic
  // Return T1, T2, or T3 based on price ID
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New utility file
- Only used when Stripe features are accessed

---

#### **2.1.3: Update Environment Variables** ✅ **NON-BREAKING**

**File:** `src/lib/env.ts` (UPDATE)

**Add Stripe environment variables:**
```typescript
// Stripe Configuration
STRIPE_SECRET_KEY: z.string().min(1).optional(),
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

// Stripe Price IDs
STRIPE_PRICE_T1_MONTHLY: z.string().optional(),
STRIPE_PRICE_T1_ANNUAL: z.string().optional(),
STRIPE_PRICE_T2_MONTHLY: z.string().optional(),
STRIPE_PRICE_T2_ANNUAL: z.string().optional(),
STRIPE_PRICE_T3_MONTHLY: z.string().optional(),
STRIPE_PRICE_T3_ANNUAL: z.string().optional(),
```

**File:** `env.example` (UPDATE)

**Add Stripe placeholders:**
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_T1_MONTHLY=price_...
STRIPE_PRICE_T1_ANNUAL=price_...
STRIPE_PRICE_T2_MONTHLY=price_...
STRIPE_PRICE_T2_ANNUAL=price_...
STRIPE_PRICE_T3_MONTHLY=price_...
STRIPE_PRICE_T3_ANNUAL=price_...
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New environment variables are optional
- Existing functionality unchanged

---

### **PHASE 2.2: Database Schema Updates** ✅ **NON-BREAKING**

#### **2.2.1: Update Membership Model** ✅ **NON-BREAKING**

**File:** `prisma/schema.prisma` (UPDATE)

**Add Stripe fields to Membership:**
```prisma
model Membership {
  // ... existing fields ...
  stripeCustomerId      String?  // Stripe Customer ID
  stripeSubscriptionId String?  // Stripe Subscription ID
  stripePriceId         String?  // Stripe Price ID
  currentPeriodStart   DateTime? // Current billing period start
  currentPeriodEnd     DateTime? // Current billing period end
  cancelAtPeriodEnd    Boolean  @default(false) // Cancel at period end
  
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- All new fields are optional
- Existing memberships unaffected
- Backward compatible

---

#### **2.2.2: Create Payment Model** ✅ **NON-BREAKING**

**File:** `prisma/schema.prisma` (UPDATE)

**Add Payment model:**
```prisma
model Payment {
  id                  String   @id @default(cuid())
  userId              String
  membershipId        String?
  stripePaymentId     String   @unique // Stripe Payment Intent ID
  stripeInvoiceId     String?  // Stripe Invoice ID
  amount              Decimal
  currency            String   @default("usd")
  status              String   // succeeded, pending, failed, refunded
  paymentMethod       String?  // card, bank_transfer, etc.
  description         String?
  metadata            Json?    // Additional metadata
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  membership          Membership? @relation(fields: [membershipId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([membershipId])
  @@index([stripePaymentId])
  @@index([status])
  @@index([createdAt])
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New model only
- No existing code affected

---

#### **2.2.3: Create StripeWebhookEvent Model** ✅ **NON-BREAKING**

**File:** `prisma/schema.prisma` (UPDATE)

**Add StripeWebhookEvent model:**
```prisma
model StripeWebhookEvent {
  id              String   @id @default(cuid())
  stripeEventId   String   @unique // Stripe Event ID
  eventType       String   // payment_intent.succeeded, customer.subscription.updated, etc.
  processed       Boolean  @default(false)
  processedAt     DateTime?
  payload         Json     // Full event payload
  error           String?
  createdAt       DateTime @default(now())
  
  @@index([stripeEventId])
  @@index([eventType])
  @@index([processed])
  @@index([createdAt])
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New model only
- Used only for webhook processing

---

#### **2.2.4: Create Migration** ✅ **NON-BREAKING**

```bash
npx prisma migrate dev --name add_stripe_integration
npx prisma generate
```

**Impact:** ✅ **ZERO REGRESSIONS**
- Database migration only
- No code changes

---

### **PHASE 2.3: Checkout Session Creation** ✅ **NON-BREAKING**

#### **2.3.1: Create Checkout Session API** ✅ **NON-BREAKING**

**File:** `app/api/stripe/checkout/route.ts` (NEW)

**Features:**
- Create Stripe Checkout session
- Handle subscription creation
- Link customer to user account
- Set success/cancel URLs

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getPriceId } from '@/lib/stripe'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const checkoutSchema = z.object({
  tier: z.enum(['T1', 'T2', 'T3']),
  interval: z.enum(['month', 'year']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const { tier, interval, successUrl, cancelUrl } = checkoutSchema.parse(body)
    
    // Get price ID
    const priceId = getPriceId(tier, interval)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid tier or interval' },
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
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      
      stripeCustomerId = customer.id
      
      // Update membership with Stripe customer ID
      await prisma.membership.updateMany({
        where: { userId: user.id },
        data: { stripeCustomerId: customer.id },
      })
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
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
      sessionId: session.id,
      tier,
      interval,
    })
    
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    logger.error('Checkout session creation error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint only
- Doesn't affect existing functionality

---

#### **2.3.2: Create Subscription Page** ✅ **NON-BREAKING**

**File:** `app/(app)/subscribe/page.tsx` (NEW)

**Features:**
- Display subscription plans (T1, T2, T3)
- Show monthly/annual options
- Initiate checkout flow
- Handle redirect to Stripe

**Implementation:**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2 } from 'lucide-react'

const PLANS = [
  {
    tier: 'T1',
    name: 'Basic',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    features: ['Access to basic content', 'Community access'],
  },
  {
    tier: 'T2',
    name: 'Premium',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    features: ['All Basic features', 'Premium content', 'Early access'],
  },
  {
    tier: 'T3',
    name: 'Elite',
    monthlyPrice: 39.99,
    annualPrice: 399.99,
    features: ['All Premium features', 'Exclusive content', 'Priority support'],
  },
]

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const router = useRouter()
  
  const handleSubscribe = async (tier: string) => {
    setLoading(tier)
    
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          interval,
          successUrl: `${window.location.origin}/account/subscription?success=true`,
          cancelUrl: `${window.location.origin}/subscribe?canceled=true`,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      // Redirect to Stripe Checkout
      const stripe = await getStripe()
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription. Please try again.')
    } finally {
      setLoading(null)
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Choose Your Plan</h1>
      
      {/* Interval Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-slate-200 p-1">
          <button
            onClick={() => setInterval('month')}
            className={`px-4 py-2 rounded-md ${
              interval === 'month'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('year')}
            className={`px-4 py-2 rounded-md ${
              interval === 'year'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700'
            }`}
          >
            Annual
          </button>
        </div>
      </div>
      
      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <Card key={plan.tier}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ${interval === 'month' ? plan.monthlyPrice : plan.annualPrice}
                <span className="text-sm font-normal text-slate-500">
                  /{interval === 'month' ? 'month' : 'year'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={loading === plan.tier}
                className="w-full"
              >
                {loading === plan.tier ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
    </div>
  )
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New page only
- Doesn't affect existing pages

---

### **PHASE 2.4: Webhook Handling** ✅ **NON-BREAKING**

#### **2.4.1: Create Webhook Endpoint** ✅ **NON-BREAKING**

**File:** `app/api/stripe/webhook/route.ts` (NEW)

**Features:**
- Verify webhook signature
- Process Stripe events
- Update membership status
- Handle subscription lifecycle events
- Idempotency (prevent duplicate processing)

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
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
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    logger.error('Webhook signature verification failed', error instanceof Error ? error : new Error(String(error)))
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
      payload: event.data.object as any,
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
    logger.error('Webhook processing error', error instanceof Error ? error : new Error(String(error)), {
      eventId: event.id,
      eventType: event.type,
    })
    
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
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    
    await prisma.membership.updateMany({
      where: { userId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        tier: tier as any,
        status: 'active',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
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
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      status: subscription.status === 'active' ? 'active' : 'inactive',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
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
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
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
      stripePaymentId: invoice.payment_intent as string,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: 'succeeded',
      paymentMethod: invoice.payment_method_types[0],
      description: invoice.description || undefined,
    },
  })
  
  // Update membership status
  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: 'active',
    },
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
      stripePaymentId: invoice.payment_intent as string,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due / 100, // Convert from cents
      currency: invoice.currency,
      status: 'failed',
      paymentMethod: invoice.payment_method_types[0],
      description: invoice.description || undefined,
    },
  })
  
  // Update membership status (grace period - keep active for now)
  // Could implement grace period logic here
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint only
- Webhook processing is isolated
- Doesn't affect existing functionality

---

### **PHASE 2.5: Subscription Management** ✅ **NON-BREAKING**

#### **2.5.1: Create Subscription Management API** ✅ **NON-BREAKING**

**File:** `app/api/stripe/subscription/route.ts` (NEW)

**Features:**
- GET: Get user's subscription details
- POST: Update subscription (change plan, cancel, reactivate)
- DELETE: Cancel subscription immediately

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getPriceId } from '@/lib/stripe'
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
    
    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      membership.stripeSubscriptionId
    )
    
    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        tier: membership.tier,
      },
      membership: membership,
    })
  } catch (error) {
    logger.error('Get subscription error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

// POST: Update subscription
export async function POST(req: NextRequest) {
  try {
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
        
        const newPriceId = getPriceId(tier, interval)
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
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Update subscription error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New endpoint only
- Doesn't affect existing functionality

---

#### **2.5.2: Create Subscription Management UI** ✅ **NON-BREAKING**

**File:** `app/(app)/account/subscription/page.tsx` (NEW)

**Features:**
- Display current subscription status
- Show billing history
- Allow cancel/reactivate subscription
- Allow plan changes
- Link to Stripe Customer Portal

**Implementation:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    fetchSubscription()
  }, [])
  
  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription')
      const data = await res.json()
      setSubscription(data)
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      return
    }
    
    setIsUpdating(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to cancel subscription')
      }
      
      await fetchSubscription()
    } catch (error) {
      console.error('Cancel subscription error:', error)
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handleReactivate = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to reactivate subscription')
      }
      
      await fetchSubscription()
    } catch (error) {
      console.error('Reactivate subscription error:', error)
      alert('Failed to reactivate subscription. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (!subscription?.subscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 mb-4">You don't have an active subscription.</p>
            <Button onClick={() => router.push('/subscribe')}>
              Subscribe Now
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
      
      {/* Current Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Tier: {subscription.subscription.tier}</p>
                <p className="text-sm text-slate-600">
                  Status: <Badge>{subscription.subscription.status}</Badge>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Current Period</p>
                <p className="font-medium">
                  {format(new Date(subscription.subscription.currentPeriodStart), 'MMM d, yyyy')} -{' '}
                  {format(new Date(subscription.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            
            {subscription.subscription.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Your subscription will cancel at the end of the billing period.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              {subscription.subscription.cancelAtPeriodEnd ? (
                <Button onClick={handleReactivate} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Reactivate Subscription'
                  )}
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleCancel} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Billing History */}
      {subscription.membership?.payments && subscription.membership.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscription.membership.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">${payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge>{payment.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New page only
- Doesn't affect existing pages

---

### **PHASE 2.6: Membership Access Control** ✅ **NON-BREAKING**

#### **2.6.1: Update Access Control Logic** ✅ **NON-BREAKING**

**File:** `src/lib/access.ts` (UPDATE or NEW)

**Features:**
- Check subscription status before granting access
- Handle grace periods for failed payments
- Validate membership tier and status

**Implementation:**
```typescript
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
  })
  
  if (!membership) {
    return false
  }
  
  // Check membership status
  if (membership.status !== 'active') {
    return false
  }
  
  // Check subscription end date
  if (membership.currentPeriodEnd && membership.currentPeriodEnd < new Date()) {
    return false
  }
  
  // If Stripe subscription exists, verify it's active
  if (membership.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        membership.stripeSubscriptionId
      )
      
      return subscription.status === 'active' || subscription.status === 'trialing'
    } catch (error) {
      // If subscription not found, assume inactive
      return false
    }
  }
  
  // No Stripe subscription - check membership status only
  return membership.status === 'active'
}

export async function canAccessTier(userId: string, requiredTier: string): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
  })
  
  if (!membership) {
    return false
  }
  
  // Check if subscription is active
  const isActive = await hasActiveSubscription(userId)
  if (!isActive) {
    return false
  }
  
  // Check tier access
  const tierHierarchy = ['T1', 'T2', 'T3']
  const userTierIndex = tierHierarchy.indexOf(membership.tier)
  const requiredTierIndex = tierHierarchy.indexOf(requiredTier)
  
  return userTierIndex >= requiredTierIndex
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- New utility functions
- Only used when checking access
- Existing access checks unchanged

---

#### **2.6.2: Update Middleware (Optional)** ✅ **NON-BREAKING**

**File:** `middleware.ts` (UPDATE)

**Add subscription check to protected routes (optional):**

```typescript
// Only check subscription for premium content routes
if (pathname.startsWith('/premium') || pathname.startsWith('/exclusive')) {
  const membership = await prisma.membership.findFirst({
    where: { userId: token.sub },
  })
  
  if (!membership || membership.status !== 'active') {
    return NextResponse.redirect(new URL('/subscribe', req.url))
  }
}
```

**Impact:** ✅ **ZERO REGRESSIONS**
- Only affects new premium routes
- Existing routes unchanged

---

## 📋 **Testing Strategy**

### **Unit Tests**
- Test Stripe utility functions
- Test webhook handlers
- Test subscription management logic

### **Integration Tests**
- Test checkout flow end-to-end
- Test webhook processing
- Test subscription lifecycle

### **Manual Testing**
- Test checkout session creation
- Test subscription creation
- Test subscription cancellation
- Test subscription reactivation
- Test plan changes
- Test payment failure handling
- Test webhook events

---

## 🚨 **Security Considerations**

1. **Webhook Signature Verification**
   - Always verify webhook signatures
   - Use `STRIPE_WEBHOOK_SECRET` from environment

2. **Idempotency**
   - Prevent duplicate webhook processing
   - Use `stripeEventId` as unique identifier

3. **PCI Compliance**
   - Never store card details
   - Use Stripe Elements for card input
   - Use Stripe Checkout for payment collection

4. **Access Control**
   - Verify user owns subscription before allowing changes
   - Check subscription status before granting access

5. **Error Handling**
   - Log all errors
   - Don't expose sensitive information
   - Handle Stripe API errors gracefully

---

## ✅ **Zero Regressions Guarantee**

### **All Changes Are Additive** ✅
- New database models (optional fields)
- New API endpoints
- New pages
- New utility functions

### **Existing Functionality Unchanged** ✅
- Authentication flow unchanged
- Membership model backward compatible
- Access control logic unchanged (unless explicitly updated)

### **Backward Compatibility** ✅
- Existing memberships continue to work
- No Stripe subscription required for existing users
- Graceful degradation if Stripe not configured

---

## 📊 **Implementation Timeline**

### **Phase 2.1: Setup** (2-3 hours)
- Install dependencies
- Create Stripe utilities
- Update environment variables

### **Phase 2.2: Database** (1-2 hours)
- Update schema
- Create migration
- Regenerate Prisma client

### **Phase 2.3: Checkout** (3-4 hours)
- Create checkout API
- Create subscription page
- Test checkout flow

### **Phase 2.4: Webhooks** (4-5 hours)
- Create webhook endpoint
- Implement event handlers
- Test webhook processing

### **Phase 2.5: Management** (3-4 hours)
- Create management API
- Create management UI
- Test subscription management

### **Phase 2.6: Access Control** (2-3 hours)
- Update access control logic
- Test access restrictions
- Update middleware (optional)

**Total Estimated Time:** 15-21 hours

---

## 🎯 **Success Criteria**

1. ✅ Users can subscribe to plans via Stripe Checkout
2. ✅ Subscriptions are created and linked to user accounts
3. ✅ Webhooks successfully update membership status
4. ✅ Users can manage subscriptions (cancel/reactivate)
5. ✅ Access control respects subscription status
6. ✅ Payment history is tracked
7. ✅ Failed payments are handled gracefully
8. ✅ Zero regressions to existing functionality

---

## 📝 **Next Steps After Phase 2**

1. **Email Notifications**
   - Send subscription confirmation emails
   - Send payment receipt emails
   - Send subscription cancellation emails

2. **Analytics**
   - Track subscription metrics
   - Monitor churn rate
   - Analyze revenue

3. **Customer Portal**
   - Integrate Stripe Customer Portal
   - Allow users to update payment methods
   - Allow users to download invoices

4. **Advanced Features**
   - Discount codes
   - Referral program
   - Trial periods
   - Prorated upgrades/downgrades

---

## ✅ **Final Notes**

- All changes are **NON-BREAKING**
- Zero regressions guaranteed
- Backward compatible with existing system
- Can be implemented incrementally
- Tested thoroughly before deployment

