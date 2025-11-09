# Subscription Flow & Access Control

## 🔄 Complete User Flow

### 1. **Registration & Login**
- User registers → Account created (no subscription required yet)
- User logs in → Session created, authenticated
- **Status**: ✅ Authenticated, ❌ No subscription

### 2. **Access Attempt**
- User tries to access protected content (dashboard, learning, research, etc.)
- **Middleware** checks: ✅ Is user authenticated?
  - If NO → Redirect to `/login`
  - If YES → Continue to page

### 3. **Subscription Check** (NEW)
- **Page-level check** (e.g., `/dashboard`):
  - Checks if user has active subscription via `hasActiveSubscription()`
  - If NO subscription → Redirect to `/subscribe?required=true`
  - If YES subscription → Allow access

### 4. **Subscription Purchase**
- User lands on `/subscribe` page
- Selects tier (Foundation T1, Growth T2, Elite T3)
- Selects billing interval (1 month, 3 months, 6 months, 12 months)
- Clicks "Subscribe Now"
- **Stripe Checkout** → User completes payment
- **Stripe Webhook** → `checkout.session.completed` event
- **Webhook Handler** → Creates/updates membership in database
- User redirected to `/account/subscription?success=true`
- **Status**: ✅ Authenticated, ✅ Active subscription

### 5. **Ongoing Access**
- User can now access all protected content
- Subscription status checked on each page load
- Webhook keeps membership status in sync with Stripe

---

## 🛡️ Access Control Implementation

### Current Implementation

#### **Middleware** (`middleware.ts`)
- ✅ Checks authentication (must be logged in)
- ✅ Defines subscription-exempt routes:
  - `/subscribe`
  - `/account`
  - `/account/subscription`
  - `/api/stripe`
  - `/api/auth`
  - `/api/me/account`
  - Auth pages (login, register, etc.)

#### **Page-Level Checks**
- **Dashboard** (`app/(app)/dashboard/page.tsx`):
  - ✅ Checks subscription before rendering
  - Redirects to `/subscribe` if no subscription

#### **Access Utilities** (`src/lib/access.ts`)
- `hasActiveSubscription(userId)` - Checks if user has active subscription
- `canAccessTier(userId, tier)` - Checks tier-based access
- `getUserMembership(userId)` - Gets membership info

### What's Protected

**Protected Routes** (require subscription):
- `/dashboard` ✅ (implemented)
- `/learning` (needs implementation)
- `/learn/*` (needs implementation)
- `/research` (needs implementation)
- `/macro` (needs implementation)
- `/signals` (needs implementation)
- `/community` (needs implementation)
- `/events` (needs implementation)
- `/resources` (needs implementation)

**Public Routes** (no subscription required):
- `/login`
- `/register`
- `/subscribe`
- `/account`
- `/account/subscription`
- `/forgot-password`
- `/reset-password`

---

## 🔧 How to Add Subscription Check to Other Pages

### Option 1: Use `requireSubscription()` (Recommended)

```tsx
import { requireSubscription } from '@/lib/subscription-guard'

export default async function MyPage() {
  await requireSubscription() // Redirects if no subscription
  
  // Your page content here
  return <div>Protected content</div>
}
```

### Option 2: Manual Check

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { hasActiveSubscription } from '@/lib/access'
import { redirect } from 'next/navigation'

export default async function MyPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }
  
  const hasSubscription = await hasActiveSubscription(session.user.id)
  
  if (!hasSubscription) {
    redirect('/subscribe?required=true')
  }
  
  // Your page content here
  return <div>Protected content</div>
}
```

---

## 📊 Subscription Status Checks

### How `hasActiveSubscription()` Works

1. **Checks membership exists** in database
2. **Checks membership status** = 'active'
3. **Checks subscription period** hasn't expired (`currentPeriodEnd`)
4. **Verifies with Stripe** (if configured):
   - Retrieves subscription from Stripe
   - Checks status = 'active' or 'trialing'
   - Falls back to database if Stripe check fails

### When Subscription Becomes Active

- ✅ After successful Stripe checkout
- ✅ Webhook processes `checkout.session.completed`
- ✅ Membership record created/updated with:
  - `status` = 'active'
  - `stripeSubscriptionId` = subscription ID
  - `currentPeriodStart` = subscription start date
  - `currentPeriodEnd` = subscription end date
  - `tier` = T1, T2, or T3

### When Subscription Becomes Inactive

- ❌ Subscription cancelled in Stripe
- ❌ Payment fails and subscription is cancelled
- ❌ Subscription period expires (`currentPeriodEnd` < now)
- ❌ Webhook processes `customer.subscription.deleted`

---

## 🎯 Next Steps

To fully protect the platform:

1. **Add subscription checks to all protected pages:**
   - `/learning` → Add `requireSubscription()`
   - `/learn/*` → Add `requireSubscription()`
   - `/research` → Add `requireSubscription()`
   - `/macro/*` → Add `requireSubscription()`
   - `/signals` → Add `requireSubscription()`
   - `/community` → Add `requireSubscription()`
   - `/events` → Add `requireSubscription()`
   - `/resources` → Add `requireSubscription()`

2. **Update subscribe page** to show message when `?required=true`:
   ```tsx
   // Show banner: "You need a subscription to access this content"
   ```

3. **Test the flow:**
   - Register new user
   - Try to access dashboard → Should redirect to subscribe
   - Complete subscription
   - Try to access dashboard → Should work

---

## 🔐 Security Notes

- ✅ All subscription checks happen server-side
- ✅ Stripe webhooks verify signatures
- ✅ Database and Stripe are kept in sync
- ✅ Fail-closed: If subscription check fails, deny access
- ✅ Admin users bypass checks (handled in `canViewContent`)

