# Auth, Membership, Trial Audit (Stewart & Co)

Date: January 27, 2026  
Scope: Free trial flow, auth/login flow, membership system (profiles, tiers/permissions, entitlements), scale readiness.

## System map (PHASE 0)

### Auth/login
- Provider: NextAuth (JWT strategy), Credentials + Google OAuth + Email magic link providers.
  - Config: `src/lib/auth.ts`
  - Session/JWT callbacks & membershipTier hydration: `src/lib/auth.ts`
  - Session type overrides: `src/types/next-auth.d.ts`
- UI entry points:
  - Login: `app/(auth)/login/page.tsx`
  - Register: `app/(auth)/register/page.tsx`
  - Forgot/reset password: `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`
  - Verify email: `app/(auth)/verify-email/page.tsx`
- Handlers:
  - Register: `app/api/auth/register/route.ts`
  - Password reset request/confirm: `app/api/auth/reset-password/request/route.ts`, `app/api/auth/reset-password/confirm/route.ts`
  - Verify email: `app/api/auth/verify-email/route.ts`
  - Resend verification: `app/api/auth/resend-verification/route.ts`
- Session cookie:
  - Cookie name configured explicitly: `src/lib/auth.ts`
  - Edge middleware reads JWT from cookie: `middleware.ts`
- CSRF:
  - NextAuth endpoints handle CSRF internally.
  - Custom CSRF middleware applied to `/api/*` via `middleware.ts` (skips `/api/stripe/webhook` and `/api/cron/*`).

### Member system (profiles, tiers, entitlements)
- Primary DB entities:
  - `User` (role, auth data, profile state): `prisma/schema.prisma`
  - `Membership` (tier, status, currentPeriodStart/End, Stripe IDs): `prisma/schema.prisma`
  - `Payment`, `StripeWebhookEvent`: `prisma/schema.prisma`
- Role vs tier:
  - Role: `guest | member | editor | admin` on `User`
  - Tier: `T1 | T2 | T3` on `Membership`
- Profile storage and update:
  - Account read/update: `app/api/me/account/route.ts`
  - Session role/tier set in `src/lib/auth.ts` via JWT callback
- Server access helpers:
  - `requireAuth`, `requireActiveSubscription`, `requireTier` in `src/lib/access.ts`

### Free trial system
- Trial definition (DB fields):
  - `Membership.status = 'trial'`
  - `currentPeriodStart`, `currentPeriodEnd`
  - `tier`
- Trial creation:
  - Public signup with trial: `app/api/auth/register/route.ts` (30 days, tier T2)
  - Admin create trial for existing user: `app/api/admin/trials/route.ts`
  - Admin create user with trial: `app/api/admin/users/create/route.ts`
- Trial enforcement:
  - On-request checks in `src/lib/access.ts` (used by `/api/me/subscription-status`)
  - Nightly cron added: `app/api/cron/trial-expiry/route.ts` -> `src/lib/jobs/trial-expiry.ts`

## User lifecycle flows (PHASE 1)

### 1) New user signup -> account created -> trial begins
- UI entrypoint: `/register?trial=true` (`app/(auth)/register/page.tsx`)
- API: `POST /api/auth/register` (`app/api/auth/register/route.ts`)
- DB writes:
  - `User` row created (role `guest` when trial)  
  - `Membership` row created with `status='trial'`, `tier='T2'`, `currentPeriodStart=now`, `currentPeriodEnd=now+30d`
- Session/cookies:
  - Auto sign-in after registration (NextAuth `credentials`) sets `next-auth.session-token` cookie
- Emails:
  - Verification email sent on registration (`app/api/auth/register/route.ts`, `src/lib/email.ts`).

### 2) Existing user login -> session established -> access granted by tier
- UI entrypoint: `/login` (`app/(auth)/login/page.tsx`)
- API: NextAuth `/api/auth/*` (Credentials provider)
- DB:
  - Login attempts recorded in `LoginAttempt`
  - `lastLoginAt`, `loginCount` updated (`src/lib/auth.ts`)
- Session:
  - JWT populated with `role` + `membershipTier` (`src/lib/auth.ts`)
- Access:
  - Premium pages use `requireActiveSubscription` server-side (see Gating matrix).
  - Role now limited to admin/editor surfaces; role does not grant premium access.

### 3) Trial user -> access to gated content -> upgrade path
- Trial access check: `src/lib/access.ts` (membership status + period end)
- Upgrade UI: `/subscribe` (`app/(auth)/subscribe/page.tsx`)
- Checkout API: `POST /api/stripe/checkout` (`app/api/stripe/checkout/route.ts`)
- Stripe webhook updates membership to `active`: `app/api/stripe/webhook/route.ts`

### 4) Trial expiry -> user loses access but can still login and upgrade
- Nightly cron flips expired trials to inactive (see PHASE 4).
- On-request checks enforce expiry only where used:
  - `/api/me/subscription-status` uses `hasActiveSubscription` (`app/api/me/subscription-status/route.ts`, `src/lib/access.ts`)
  - Some APIs use custom checks (now aligned; see fixes)

### 5) Password reset / magic link / email verification
- Reset request: `POST /api/auth/reset-password/request`
  - Creates verification token, sends email (`src/lib/email.ts`)
- Reset confirm: `POST /api/auth/reset-password/confirm`
  - Validates token, updates password, deletes tokens
- Email verification:
  - Verification email sent on registration and resend (`app/api/auth/register/route.ts`, `app/api/auth/resend-verification/route.ts`).
  - Enforcement: **not blocking access** (verification is informational only).

### 6) Account deletion
- Not found in codebase (no endpoint or UI).

### 7) Multiple devices/sessions + invalidation
- JWT strategy (stateless) in NextAuth (`src/lib/auth.ts`)
- No server-side session invalidation; `UserSession` model exists but unused.

## Data integrity & storage audit (PHASE 2)

### Invariants to verify (scripts)
Scripts added:
- `scripts/auth-audit.ts`
- `scripts/trial-smoke.ts`
- `scripts/page-gating-smoke.ts`

Run:
```bash
npx tsx scripts/auth-audit.ts
npx tsx scripts/trial-smoke.ts
npx tsx scripts/page-gating-smoke.ts
```

If `DATABASE_URL` is not configured, scripts will fail with a Prisma error. I did not run them here because no `.env` was present in the repo.

### SQL queries (use in Prisma Studio or `psql`)
```sql
-- Duplicate emails (case-insensitive)
SELECT LOWER(email) AS email, COUNT(*)::int AS count
FROM "User"
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Users without membership
SELECT COUNT(*)::int
FROM "User" u
LEFT JOIN "Membership" m ON m."userId" = u.id
WHERE m.id IS NULL;

-- Memberships without users
SELECT COUNT(*)::int
FROM "Membership" m
LEFT JOIN "User" u ON u.id = m."userId"
WHERE u.id IS NULL;

-- Trials missing end date (should be 0)
SELECT COUNT(*)::int
FROM "Membership"
WHERE status = 'trial' AND "currentPeriodEnd" IS NULL;

-- Trial range invalid
SELECT id, "userId", "currentPeriodStart", "currentPeriodEnd"
FROM "Membership"
WHERE status = 'trial'
  AND "currentPeriodStart" > "currentPeriodEnd";

-- Trial or active but expired
SELECT id, "userId", status, "currentPeriodEnd"
FROM "Membership"
WHERE status IN ('trial','active')
  AND "currentPeriodEnd" IS NOT NULL
  AND "currentPeriodEnd" < NOW();
```

### Script outputs (expected)
- `scripts/auth-audit.ts` prints:
  - counts for duplicates, orphan records, invalid trial date ranges, expired trials
  - counts for role/membership mismatches (`premiumAccessWithoutActiveMembership`)
  - top 20 most recent signups with membership state
- `scripts/trial-smoke.ts` prints:
  - `hasActiveSubscription` before/after expiry
  - `/api/me/subscription-status` responses before/after expiry
- `scripts/page-gating-smoke.ts` prints:
  - redirect vs render outcomes for premium pages (logged out + expired trial)

## Gating matrix (PHASE 3)

Status legend: **OK** = server-enforced, **Weak** = client-only or role-only, **Missing** = no enforcement.

| Route | Required tier/role | Enforcement location | Status |
| --- | --- | --- | --- |
| `/dashboard` | Active subscription | `requireActiveSubscription` (`app/(app)/dashboard/page.tsx`) | OK |
| `/portfolio` | Active subscription | `requireActiveSubscription` (`app/(app)/portfolio/page.tsx`) | OK |
| `/api/portfolio-daily-signals` | Active subscription | `requireActiveSubscription` (`app/api/portfolio-daily-signals/route.ts`) | OK |
| `/api/roi` | Active subscription + tier | `requireActiveSubscription` + tier check (`app/api/roi/route.ts`) | OK |
| `/portfolio/performance` | Active subscription | `requireActiveSubscription` (`app/(app)/portfolio/performance/page.tsx`) | OK |
| `/portfolio/closed` | Active subscription | `requireActiveSubscription` (`app/(app)/portfolio/closed/page.tsx`) | OK |
| `/learning` | Active subscription | `requireActiveSubscription` (`app/(app)/learning/page.tsx`) | OK |
| `/learn/[trackSlug]` | Active subscription | `requireActiveSubscription` (`app/(app)/learn/[trackSlug]/page.tsx`) | OK |
| `/learn/[trackSlug]/lesson/[lessonSlug]` | Active subscription | `requireActiveSubscription` (`app/(app)/learn/[trackSlug]/lesson/[lessonSlug]/page.tsx`) | OK |
| `/content/[slug]` | Active subscription + content minTier | `hasActiveSubscription`/`canAccessTier` (`app/content/[slug]/page.tsx`) | OK (locked/minTier) |
| `/crypto-compass` | Active subscription | `requireActiveSubscription` (`app/(app)/crypto-compass/page.tsx`) | OK |
| `/crypto-compass/[slug]` | Active subscription | `requireActiveSubscription` (`app/crypto-compass/[slug]/page.tsx`) | OK |
| `/community` | Active subscription | layout + APIs via `requireActiveSubscription` | OK |
| `/admin/*` | Admin/editor role | `app/admin/layout.tsx` (`requireRole`) | OK |

## Trial enforcement mechanism (PHASE 4)

- **On-request checks**: `hasActiveSubscription` in `src/lib/access.ts` (used by `/api/me/subscription-status`).
- **Scheduled job**: nightly cron `app/api/cron/trial-expiry/route.ts` runs `src/lib/jobs/trial-expiry.ts` with DB lock.
- **Schedule**: Vercel cron configured in `vercel.json` (daily at 03:00 UTC).
- **Stripe webhooks** update membership status and period dates: `app/api/stripe/webhook/route.ts`.
- **Edge cases**:
  - Trial with no `currentPeriodEnd` would previously grant indefinite access; fixed in `src/lib/access.ts`.
  - API endpoints must use `currentPeriodEnd` checks consistently (now aligned for ROI + daily signals).
  - Webhook failure can leave membership stale; no reconciliation job exists.

## Scale readiness checks (PHASE 5)

- Rate limiting:
  - Middleware matcher now includes `/api` with scoped limits in `middleware.ts` (auth/register/reset/checkout).
  - Password reset retains its own rate limit (`app/api/auth/reset-password/request/route.ts`).
- Email sending:
  - Password reset + trial notifications send synchronously in request path (`src/lib/email.ts`, `app/api/admin/*`).
  - No async queue; higher traffic could cause latency and timeout risk.
- DB indexes:
  - `User.email` unique; `Membership.userId` unique; indexes on stripe IDs and foreign keys present (`prisma/schema.prisma`).
- Cron jobs:
  - Cron routes exist for ROI/reminders and trial expiry (`app/api/cron/trial-expiry/route.ts`).
  - No Stripe reconciliation job.
- Session storage:
  - JWT strategy, no server-side invalidation; `UserSession` model unused.

## Findings & recommendations (PHASE 6)

### P0 (critical)
1) **Pre-checkout access bug**: creating Stripe customer created a `trial` membership without end date, allowing indefinite access.  
   - Fixed: `app/api/stripe/checkout/route.ts`
2) **Expired trials still passed API checks** in ROI and daily signals.  
   - Fixed: `app/api/roi/route.ts`, `app/api/portfolio-daily-signals/route.ts`, `src/lib/access.ts`
3) **Paid content access not consistently enforced server-side** (dashboard, portfolio performance/closed, learning, crypto-compass, content, community).  
   - Fixed: `requireActiveSubscription`/tier checks added to pages and community APIs.

### P1 (high)
1) **Email verification flow is incomplete**: no verification email sent on registration or resend.  
   - Fixed: verification emails sent via `src/lib/email.ts` from `app/api/auth/register/route.ts` and `app/api/auth/resend-verification/route.ts`.
2) **No trial-expiry job**: relies on on-request checks only.  
   - Fixed: nightly cron `app/api/cron/trial-expiry/route.ts` -> `src/lib/jobs/trial-expiry.ts`.
3) **No Stripe reconciliation job** for missed webhooks.  
   - Add periodic sync for subscriptions and memberships.
4) **Middleware rate limiting/CSRF not applied to `/api` routes** due to matcher.  
   - Fixed: middleware matcher now includes `/api` with scoped limits and CSRF exceptions for webhook/cron.

### P2 (medium)
1) **Membership status taxonomy inconsistent** (`inactive` vs `paused` vs `trial`).  
   - Normalize and enforce with enum.
2) **Role vs membership conflation**: role `member` does not necessarily imply active subscription.  
   - Use explicit subscription checks for entitlement.

## Fixes applied
- Prevented trial access being granted during Stripe checkout initiation.  
  - `app/api/stripe/checkout/route.ts`
- Enforced trial end date in `hasActiveSubscription`.  
  - `src/lib/access.ts`
- Aligned ROI and daily signal APIs to enforce `currentPeriodEnd`.  
  - `app/api/roi/route.ts`, `app/api/portfolio-daily-signals/route.ts`
- Server-side subscription gating added to premium pages (dashboard, portfolio, performance/closed, learning, crypto-compass, content, community).  
  - `src/lib/access.ts`, `app/(app)/**`, `app/content/[slug]/page.tsx`, `app/(app)/community/layout.tsx`
- Nightly trial expiry cron with DB lock.  
  - `app/api/cron/trial-expiry/route.ts`, `src/lib/jobs/trial-expiry.ts`, `vercel.json`
- Verification emails now sent on registration and resend (non-blocking).  
  - `app/api/auth/register/route.ts`, `app/api/auth/resend-verification/route.ts`, `src/lib/email.ts`
- API rate limiting applied via middleware (scoped limits).  
  - `middleware.ts`, `src/lib/security.ts`

## Before/after evidence (post-fix)
- Server-side gating:
  - Before: premium pages rendered without a server subscription check (e.g., `/dashboard`).
  - After: `requireActiveSubscription` enforced before data fetching/render.
  - Evidence: `app/(app)/dashboard/page.tsx`, `app/(app)/portfolio/page.tsx`, `app/(app)/portfolio/performance/page.tsx`, `app/(app)/learning/page.tsx`, `app/(app)/crypto-compass/page.tsx`, `app/(app)/community/layout.tsx`.
- Role/tier confusion:
  - Before: admin/editor role could bypass subscription checks.
  - After: access determined strictly by membership status/tier; role only gates admin/editor tools.
  - Evidence: `src/lib/access.ts`, `src/components/SubscriptionGuard.tsx`, `src/lib/subscription-gate.tsx`, `src/components/signals/DailySignalDisplay.tsx`, `app/api/me/subscription-status/route.ts`, `app/(auth)/login/page.tsx`.
- Trial expiry enforcement:
  - Before: no scheduled expiry; only on-request checks.
  - After: nightly cron + DB lock + idempotent updates to `inactive`.
  - Evidence: `app/api/cron/trial-expiry/route.ts`, `src/lib/jobs/trial-expiry.ts`, `vercel.json`.
- Email verification:
  - Before: verification UX existed but no email sent on registration/resend.
  - After: verification tokens created and `sendVerificationEmail` invoked.
  - Evidence: `app/api/auth/register/route.ts`, `app/api/auth/resend-verification/route.ts`, `src/lib/email.ts`.
- Rate limiting:
  - Before: `/api/*` not rate limited by middleware.
  - After: `/api` matcher enabled with scoped limits for auth and Stripe checkout.
  - Evidence: `middleware.ts`, `src/lib/security.ts`.

## How to verify (PHASE 7)

### Scripts
```bash
npx tsx scripts/auth-audit.ts
npx tsx scripts/trial-smoke.ts
npx tsx scripts/page-gating-smoke.ts
```

### Manual API checks
```bash
# Requires auth cookie
GET /api/me/subscription-status
GET /api/portfolio-daily-signals
GET /api/roi
```
Expected:
- Trial with `currentPeriodEnd` in future: `hasActiveSubscription: true`
- Trial with `currentPeriodEnd` in past: `hasActiveSubscription: false`, `403` on signals/ROI

### Email verification
```bash
# Register (expect verification token + email send)
POST /api/auth/register

# Resend verification
POST /api/auth/resend-verification
```
Expected:
- `VerificationToken` row created/rotated for the user.
- Email send log entry from `sendVerificationEmail`.

### Trial expiry cron
```bash
# Vercel cron
GET /api/cron/trial-expiry

# Manual trigger with secret
GET /api/cron/trial-expiry?secret=$VERCEL_CRON_SECRET
```
Expected:
- Expired `trial` or `active` memberships are set to `inactive`
- Job is idempotent (second run updates 0 rows)
- Schedule configured in `vercel.json` (daily).

### Page gating (server-side)
- Run `scripts/page-gating-smoke.ts`
- Expect:
  - Logged-out requests redirect to `/login`
  - Expired trial redirects to `/subscribe?required=true`

### Rate limiting
- Send 6+ rapid requests to `/api/auth/register` and `/api/auth/reset-password/request`.
- Expect `429` responses after limits are exceeded (with retry headers).

### Test users
1) Trial user created from `/register?trial=true`
2) Non-trial user from `/register`
3) Admin user

### Expected DB state after flows
- Trial signup:
  - `Membership.status = 'trial'`
  - `currentPeriodEnd = now + 30 days`
- Stripe checkout initiated (before webhook):
  - `Membership.status = 'inactive'` (no access)
- After Stripe webhook:
  - `Membership.status = 'active'`
  - `currentPeriodEnd` set to Stripe period end
