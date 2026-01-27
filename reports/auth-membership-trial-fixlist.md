# Auth/Membership/Trial Fixlist (Prioritized)

Date: January 27, 2026

## P0 (critical)

1) Block pre-checkout access grant  
   - Status: **Applied**  
   - Risk: Users could get indefinite access without payment  
   - Files: `app/api/stripe/checkout/route.ts`  
   - Verify: Start checkout for a new user; confirm membership status is `inactive` and `/api/me/subscription-status` returns `false`.

2) Enforce `currentPeriodEnd` for trial access in core checks  
   - Status: **Applied**  
   - Risk: Expired trials could still access paid data  
   - Files: `src/lib/access.ts`  
   - Verify: `scripts/trial-smoke.ts` should show access flip after expiry.

3) Server-side subscription gating for paid data APIs  
   - Status: **Applied (ROI + Daily Signals)**  
   - Risk: Premium data leaked to expired trials  
   - Files: `app/api/roi/route.ts`, `app/api/portfolio-daily-signals/route.ts`  
   - Verify: Expired trial returns `403` and empty signals.

4) Missing server-side subscription enforcement on premium pages  
   - Status: **Proposed**  
   - Risk: Unsubscribed users can load premium content via server-rendered pages  
   - Files (examples):  
     - `app/(app)/dashboard/page.tsx`  
     - `app/(app)/portfolio/performance/page.tsx`  
     - `app/(app)/portfolio/closed/page.tsx`  
     - `app/(app)/learning/page.tsx`, `app/(app)/learn/[trackSlug]/page.tsx`  
     - `app/crypto-compass/[slug]/page.tsx`  
     - `app/content/[slug]/page.tsx`  
   - Fix approach: add `hasActiveSubscription` or `canAccessTier` checks server-side and return 403/redirect to `/subscribe`.

5) Role-only gating for content bypasses subscription  
   - Status: **Proposed**  
   - Risk: Users with role `member` but no active membership can access locked content  
   - Files: `app/content/[slug]/page.tsx`, `app/api/auth/register/route.ts`  
   - Fix approach: enforce active membership in content gating, or set role `guest` until membership exists.

## P1 (high)

1) Email verification flow incomplete  
   - Status: **Proposed**  
   - Risk: Email verification is advertised but never sent; users remain unverified  
   - Files: `app/api/auth/register/route.ts`, `app/api/auth/resend-verification/route.ts`  
   - Fix approach: send verification email on register + resend; enforce `emailVerified` at login if required.

2) No trial-expiry job  
   - Status: **Proposed**  
   - Risk: Expired trials remain `status='trial'`, hard to audit  
   - Files: add cron in `app/api/cron/*` or background job in `src/lib/jobs/*`  
   - Fix approach: nightly job that sets status to `inactive` when `currentPeriodEnd < now()`.

3) No Stripe reconciliation job  
   - Status: **Proposed**  
   - Risk: missed webhooks leave membership stale  
   - Files: add job in `src/lib/jobs/*`, leverage Stripe API  
   - Fix approach: daily sync of `stripeSubscriptionId` states into `Membership`.

4) API rate limiting/CSRF not applied  
   - Status: **Proposed**  
   - Risk: brute-force or abuse on API endpoints  
   - Files: `middleware.ts`, `src/lib/security.ts`  
   - Fix approach: update middleware matcher or apply per-route guards for `/api/*`.

## P2 (medium)

1) Membership status taxonomy inconsistent (`inactive` vs `paused`)  
   - Status: **Proposed**  
   - Risk: reporting and gating inconsistencies  
   - Files: `prisma/schema.prisma`, `app/api/stripe/webhook/route.ts`, admin dashboards  
   - Fix approach: normalize status values and update dashboards/filters.

2) JWT-only sessions without server invalidation  
   - Status: **Proposed**  
   - Risk: cannot revoke sessions across devices  
   - Files: `src/lib/auth.ts`, `prisma/schema.prisma`  
   - Fix approach: implement session revocation or use database sessions if needed.

## Scripts added
- `scripts/auth-audit.ts`
- `scripts/trial-smoke.ts`

Run:
```bash
npx tsx scripts/auth-audit.ts
npx tsx scripts/trial-smoke.ts
```
