# 💳 Stripe Payment Gateway Integration Plan

**Date:** December 2024  
**Status:** 📋 **Planning Phase**  
**Priority:** 🔴 CRITICAL - Required for app completion

---

## 🎯 **Executive Summary**

This plan outlines the comprehensive integration of Stripe payment gateway into the CryptoMentorship application. The integration will enable secure subscription management for membership tiers (T1, T2, T3), payment processing, webhook handling, and frontend checkout flows.

**Prerequisites:**
- ✅ Secure authentication system (MUST be fixed first)
- ✅ Database transactions (already implemented)
- ✅ Membership model in Prisma schema (already exists)
- ✅ Environment variable security (partially fixed)

---

## 📊 **Current State Analysis**

### **Existing Infrastructure**

1. **Database Schema:**
   - ✅ `Membership` model exists with `tier`, `status`, `startsAt`, `endsAt`
   - ✅ `User` model has membership relationships
   - ✅ No Stripe-related fields yet (need to add)

2. **Membership Tiers:**
   - **T1 (Basic):** Free/trial tier
   - **T2 (Premium):** Mid-tier subscription
   - **T3 (Ultimate):** Highest tier subscription

3. **Access Control:**
   - ✅ Tier-based content gating implemented
   - ✅ `canViewContent()` function exists
   - ⚠️ Membership status not synced with payments

### **Missing Components**

1. **Stripe Integration:**
   - ❌ No Stripe SDK installed
   - ❌ No API routes for checkout/payment
   - ❌ No webhook handlers
   - ❌ No subscription management UI
   - ❌ No payment history

2. **Database:**
   - ❌ No Stripe customer ID storage
   - ❌ No subscription ID storage
   - ❌ No payment transaction records
   - ❌ No webhook event log

---

## 🔧 **Technical Requirements**

### **1. Stripe Products & Pricing**

**Setup Required:**
- Create 3 Stripe Products (one per tier)
- Create recurring price for each (monthly/annual)
- Configure trial periods if needed
- Set up coupon codes (optional)

**Products Structure:**
```
Product: T1 Membership (Basic)
  - Price: $0/month (free tier)
  - Features: Basic content access

Product: T2 Membership (Premium)
  - Price: $X/month (configurable)
  - Features: Premium content, analytics, community access

Product: T3 Membership (Ultimate)
  - Price: $Y/month (configurable)
  - Features: All content, priority support, exclusive features
```

### **2. Database Schema Updates**

**Add to `Membership` model:**
```prisma
model Membership {
  // ... existing fields ...
  
  stripeCustomerId  String?  @unique
  stripeSubscriptionId String? @unique
  stripePriceId    String?
  stripeStatus     String?  // 'active', 'past_due', 'canceled', etc.
  
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}
```

**New `Payment` model:**
```prisma
model Payment {
  id                String   @id @default(cuid())
  userId            String
  membershipId      String?
  stripePaymentId   String   @unique
  stripeChargeId    String?
  amount            Decimal
  currency          String   @default("usd")
  status            String   // 'succeeded', 'pending', 'failed'
  type              String   // 'subscription', 'one-time', 'refund'
  description       String?
  metadata          String?  // JSON string
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  membership        Membership? @relation(fields: [membershipId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([stripePaymentId])
  @@index([status])
  @@index([createdAt])
}
```

**New `WebhookEvent` model:**
```prisma
model WebhookEvent {
  id                String   @id @default(cuid())
  stripeEventId     String   @unique
  eventType         String
  processed         Boolean  @default(false)
  processingError   String?
  payload           String   // JSON string (full event payload)
  createdAt         DateTime @default(now())

  @@index([stripeEventId])
  @@index([eventType])
  @@index([processed])
  @@index([createdAt])
}
```

### **3. API Routes Structure**

```
/api/stripe/
  ├── checkout/          # Create checkout session
  ├── portal/            # Customer portal session
  ├── webhook/           # Stripe webhook handler
  ├── subscriptions/     # List/manage subscriptions
  └── prices/            # Get pricing information
```

### **4. Frontend Components**

```
src/components/stripe/
  ├── CheckoutButton.tsx      # Initiate checkout
  ├── PricingCard.tsx         # Display tier pricing
  ├── SubscriptionStatus.tsx  # Show current subscription
  ├── PaymentHistory.tsx      # Payment transaction list
  └── ManageSubscription.tsx  # Cancel/update subscription
```

### **5. Server Actions**

```
src/lib/actions/stripe.ts
  ├── createCheckoutSession()
  ├── createCustomerPortalSession()
  ├── getSubscriptionStatus()
  ├── cancelSubscription()
  └── updateSubscription()
```

---

## 🔐 **Security Requirements**

### **Critical Security Measures**

1. **Webhook Signature Verification:**
   - ✅ MUST verify Stripe webhook signatures
   - ✅ Use `stripe.webhooks.constructEvent()`
   - ✅ Store `STRIPE_WEBHOOK_SECRET` securely

2. **API Key Management:**
   - ✅ NEVER expose secret keys to client
   - ✅ Use `STRIPE_SECRET_KEY` only on server
   - ✅ Use `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on client

3. **Idempotency:**
   - ✅ Process webhook events idempotently
   - ✅ Check for duplicate events in database
   - ✅ Use Stripe event IDs for deduplication

4. **Input Validation:**
   - ✅ Validate all Stripe webhook payloads
   - ✅ Sanitize user inputs before Stripe API calls
   - ✅ Use Zod schemas for validation

5. **Error Handling:**
   - ✅ Handle Stripe API errors gracefully
   - ✅ Log errors without exposing sensitive data
   - ✅ Return user-friendly error messages

---

## 📋 **Implementation Plan**

### **Phase 1: Setup & Configuration (Day 1)**

#### **Step 1.1: Install Dependencies**
```bash
npm install stripe @stripe/stripe-js
npm install -D @types/stripe
```

#### **Step 1.2: Environment Variables**
Add to `.env.local`:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product/Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_ID_T1=price_...
STRIPE_PRICE_ID_T2=price_...
STRIPE_PRICE_ID_T3=price_...
```

#### **Step 1.3: Create Stripe Products**
1. Log into Stripe Dashboard
2. Create 3 Products (T1, T2, T3)
3. Create recurring prices for each
4. Copy Product/Price IDs to environment variables

#### **Step 1.4: Database Migration**
1. Update Prisma schema with new models
2. Run `npx prisma migrate dev --name add_stripe_models`
3. Update Prisma client: `npx prisma generate`

---

### **Phase 2: Backend Implementation (Day 2-3)**

#### **Step 2.1: Stripe Client Setup**
**File:** `src/lib/stripe.ts`
```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Use latest stable version
  typescript: true,
})

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}
```

#### **Step 2.2: Checkout Session API**
**File:** `app/api/stripe/checkout/route.ts`
- Create Stripe Checkout session
- Link to user account
- Set success/cancel URLs
- Include metadata (userId, tier)

#### **Step 2.3: Customer Portal API**
**File:** `app/api/stripe/portal/route.ts`
- Create customer portal session
- Allow subscription management
- Handle cancellations/upgrades

#### **Step 2.4: Webhook Handler**
**File:** `app/api/stripe/webhook/route.ts`
- Verify webhook signature
- Handle subscription events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Update database in transactions
- Log all events to `WebhookEvent` table

#### **Step 2.5: Subscription Management API**
**File:** `app/api/stripe/subscriptions/route.ts`
- GET: Fetch user's current subscription
- POST: Cancel subscription
- PATCH: Update subscription (tier change)

---

### **Phase 3: Frontend Implementation (Day 4)**

#### **Step 3.1: Pricing Page**
**File:** `app/(app)/pricing/page.tsx`
- Display all membership tiers
- Show features for each tier
- Include checkout buttons

#### **Step 3.2: Checkout Component**
**File:** `src/components/stripe/CheckoutButton.tsx`
- Client component
- Call `/api/stripe/checkout` API
- Redirect to Stripe Checkout

#### **Step 3.3: Subscription Status Component**
**File:** `src/components/stripe/SubscriptionStatus.tsx`
- Display current tier
- Show subscription details
- Link to customer portal

#### **Step 3.4: Payment History Component**
**File:** `src/components/stripe/PaymentHistory.tsx`
- Fetch user's payment history
- Display transaction table
- Show payment status

#### **Step 3.5: Account Page Integration**
**File:** `app/(app)/account/page.tsx`
- Add subscription management section
- Show payment history
- Include upgrade/downgrade options

---

### **Phase 4: Testing & Security (Day 5)**

#### **Step 4.1: Test Checkout Flow**
1. Test T1, T2, T3 checkout
2. Verify success/cancel redirects
3. Test with Stripe test cards

#### **Step 4.2: Test Webhooks**
1. Use Stripe CLI to test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:5001/api/stripe/webhook
   ```
2. Trigger test events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`

#### **Step 4.3: Verify Database Updates**
1. Check `Membership` table updated correctly
2. Verify `Payment` records created
3. Confirm `WebhookEvent` logging works

#### **Step 4.4: Security Audit**
1. Verify webhook signature validation
2. Check API key security
3. Test error handling
4. Verify input sanitization

#### **Step 4.5: Error Handling**
1. Handle Stripe API errors
2. Test payment failures
3. Test subscription cancellations
4. Verify user-friendly error messages

---

## 🔄 **Webhook Event Handlers**

### **Critical Events to Handle**

1. **`checkout.session.completed`:**
   - Create/update Membership record
   - Link Stripe customer ID
   - Set membership tier
   - Create Payment record

2. **`customer.subscription.created`:**
   - Update Membership with subscription ID
   - Set subscription status

3. **`customer.subscription.updated`:**
   - Update membership tier if changed
   - Update subscription status
   - Handle plan upgrades/downgrades

4. **`customer.subscription.deleted`:**
   - Mark membership as canceled
   - Set end date
   - Revoke access

5. **`invoice.payment_succeeded`:**
   - Create Payment record
   - Extend membership if needed
   - Send confirmation email

6. **`invoice.payment_failed`:**
   - Mark membership as past_due
   - Send notification to user
   - Allow retry

---

## 📊 **Database Transaction Flow**

### **Checkout Completion Flow**

```typescript
// When checkout.session.completed webhook received:

await prisma.$transaction(async (tx) => {
  // 1. Create/update Stripe customer record
  // 2. Create/update Membership
  // 3. Create Payment record
  // 4. Log WebhookEvent
  // 5. Create notification
  // 6. Audit log
})
```

### **Subscription Update Flow**

```typescript
// When customer.subscription.updated webhook received:

await prisma.$transaction(async (tx) => {
  // 1. Update Membership tier/status
  // 2. Create Payment record (if new charge)
  // 3. Log WebhookEvent
  // 4. Update access control
  // 5. Send notification
})
```

---

## 🎨 **Frontend Design Requirements**

### **Pricing Page Design**
- Match existing app styling (gold accents, slate colors)
- Clear tier comparison
- Prominent checkout buttons
- Feature highlights

### **Subscription Status Card**
- Current tier badge
- Subscription details (amount, billing period)
- Next billing date
- Manage subscription button

### **Payment History Table**
- Transaction date
- Amount
- Status (succeeded/failed)
- Invoice/download link

---

## 🚨 **Error Scenarios & Handling**

### **Payment Failures**
- Display user-friendly error message
- Allow retry payment
- Send notification email
- Mark membership as past_due

### **Webhook Failures**
- Log error to `WebhookEvent.processingError`
- Retry mechanism (Stripe automatically retries)
- Manual reconciliation process
- Alert admin if critical events fail

### **Subscription Cancellations**
- Immediate vs. end-of-period cancellation
- Grace period handling
- Access revocation timing
- Refund processing (if applicable)

---

## 📝 **Testing Checklist**

### **Unit Tests**
- [ ] Stripe client initialization
- [ ] Checkout session creation
- [ ] Webhook signature verification
- [ ] Database transaction rollback

### **Integration Tests**
- [ ] Full checkout flow (test mode)
- [ ] Webhook processing
- [ ] Subscription updates
- [ ] Payment history

### **Security Tests**
- [ ] Webhook signature validation
- [ ] API key security
- [ ] Input validation
- [ ] Error message sanitization

### **User Flow Tests**
- [ ] T1 → T2 upgrade
- [ ] T2 → T3 upgrade
- [ ] Subscription cancellation
- [ ] Payment failure recovery

---

## 🔗 **Dependencies**

### **Must Complete First**
1. ✅ Secure authentication (PrismaAdapter enabled)
2. ✅ Middleware re-enabled
3. ✅ Input sanitization (DOMPurify)
4. ✅ CSRF protection

### **Can Parallel**
- Database schema updates
- Frontend components
- API route structure

---

## 📈 **Success Metrics**

1. **Functionality:**
   - ✅ Successful checkout for all tiers
   - ✅ Webhook events processed correctly
   - ✅ Membership synced with Stripe
   - ✅ Payment history accurate

2. **Security:**
   - ✅ All webhooks verified
   - ✅ No API keys exposed
   - ✅ Proper error handling
   - ✅ Input validation working

3. **User Experience:**
   - ✅ Smooth checkout flow
   - ✅ Clear subscription status
   - ✅ Easy subscription management
   - ✅ Payment history accessible

---

## 🎯 **Estimated Timeline**

- **Phase 1 (Setup):** 4-6 hours
- **Phase 2 (Backend):** 12-16 hours
- **Phase 3 (Frontend):** 8-10 hours
- **Phase 4 (Testing):** 6-8 hours

**Total:** 3-4 days of focused work

---

## ⚠️ **Critical Notes**

1. **DO NOT deploy with test keys in production**
2. **ALWAYS verify webhook signatures**
3. **Use database transactions for webhook processing**
4. **Test thoroughly in Stripe test mode**
5. **Monitor webhook failures in production**
6. **Implement idempotency for all webhook handlers**
7. **Keep Stripe API version updated**

---

## 📚 **Resources**

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Next.js Guide](https://stripe.com/docs/stripe-js/react)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Status:** Ready for implementation after authentication is fixed  
**Next Step:** Begin Phase 1 once auth system is secure

