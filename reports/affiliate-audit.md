# Affiliate / Referral Audit

Date: 2026-01-28

Scope: Referral attribution, lifecycle tracking, admin visibility, payout scheduling, and API surface.

## Phase 0 - Current System Map (Before Extensions)
Referral entry points:
- `app/[slug]/page.tsx` - root slug handler; validates slug, sets `referral_code` cookie, redirects to `/register?ref=slug`.
- `app/ref/[code]/page.tsx` - short link handler; validates code, sets `referral_code` cookie, redirects to `/register?ref=code`.
- `app/(auth)/register/page.tsx` - reads `?ref=` and sets `document.cookie` for `referral_code`.
- `app/api/auth/register/route.ts` - reads referral code from body/cookie, calls `linkReferralToUser`.
- `src/lib/auth.ts` - `events.createUser` reads referral cookie and calls `linkReferralToUser` on OAuth signup.

Persistence and attribution:
- Cookie-based attribution: `referral_code` cookie (30 days).
- DB persistence: `User.referralSlug` (referrer code), `Referral.referralCode` for tracking link usage.
- Signup linking: `src/lib/referrals.ts` `linkReferralToUser` inserts a completed referral record.

DB models involved:
- `User` (has `referralSlug`)
- `Referral` (referrerId, referredUserId, referralCode, status, completedAt)
- `Commission` (per payment commission)
- `Payment` + `Membership` (Stripe-driven lifecycle)

Member referral dashboard:
- API: `app/api/referrals/route.ts`
- UI: `app/(app)/account/referrals/page.tsx`

Admin affiliate UI:
- None before this change. No admin endpoints for referral visibility or payouts.

## Phase 0 - Gaps Identified
- No referral timeline fields (click, signup, trial, qualified, payable, paid).
- Referred identity not stored on referral record (only via join to `User`).
- No payout scheduling / payable dates.
- No admin-wide visibility into referrals or affiliate performance.
- Commission stored per payment, but no batch payout workflow.

## Phase 1+ - Implemented Extensions (After)

### Data Model (Prisma)
New fields on `Referral`:
- Lifecycle: `clickedAt`, `signedUpAt`, `trialStartedAt`, `trialEndsAt`, `firstPaidAt`, `qualifiedAt`, `payableAt`, `paidAt`
- Identity: `referredEmail`, `referredName`
- Tracking: `slugUsed`, `source`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`
- Status enum: `PENDING`, `SIGNED_UP`, `TRIAL`, `QUALIFIED`, `PAYABLE`, `PAID`, `VOID`
- Commission: `commissionType`, `commissionValue`, `commissionAmountCents`, `currency`
- Payout: `holdDays`, `paidByUserId`, `payoutBatchId`

New model:
- `AffiliatePayoutBatch` for admin payout batching with `READY`/`PAID` lifecycle.

Schema file: `prisma/schema.prisma`
Migration: `prisma/migrations/20260128120000_affiliate_lifecycle/migration.sql`

### Lifecycle Logic
Centralized helpers in:
- `src/lib/affiliate/index.ts`
  - `computeQualifiedAtFromMembership`
  - `computePayableAt`
  - `computeCommissionAmountCents`
  - `deriveReferralStatus`
  - `markReferralQualifiedFromPayment`
  - `markReferralTrial`
  - `voidReferralIfInHold`

Wiring:
- Registration: `app/api/auth/register/route.ts` passes identity, signup timestamps, and UTM data into `linkReferralToUser`.
- OAuth signup: `src/lib/auth.ts` passes signup attribution to `linkReferralToUser`.
- Stripe webhooks: `app/api/stripe/webhook/route.ts` now marks referrals qualified on payment success, voids on cancellation/failure, and tracks trial.
- Daily cron: `app/api/cron/affiliate-payables/route.ts` runs `src/lib/jobs/affiliate-payables.ts` to advance QUALIFIED -> PAYABLE.

### Member Dashboard
UI: `app/(app)/account/referrals/page.tsx`
- Summary cards: total signups, qualified, payable, paid total.
- Detailed referral table: referred name/email, signup date, status, payable date, commission.

### Admin Dashboard
Routes:
- `app/admin/affiliates/page.tsx` (overview)
- `app/admin/affiliates/[id]/page.tsx` (detail)
- `app/admin/affiliates/payouts/page.tsx` (payout center)

Components:
- `src/components/admin/affiliates/AffiliatesOverview.tsx`
- `src/components/admin/affiliates/AffiliateDetail.tsx`
- `src/components/admin/affiliates/AffiliatePayouts.tsx`

Sidebar:
- `src/components/admin/AdminSidebar.tsx` adds Affiliates + Payouts

### APIs
Member:
- `GET /api/affiliate/summary`
- `GET /api/affiliate/referrals`

Admin:
- `GET /api/admin/affiliates`
- `GET /api/admin/affiliates/referrals` (all referral deals)
- `GET /api/admin/affiliates/[id]/referrals`
- `GET /api/admin/affiliates/payouts?status=READY|PAID|DRAFT|CANCELLED`
- `POST /api/admin/affiliates/payouts/create`
- `POST /api/admin/affiliates/payouts/[batchId]/mark-paid`
- `GET /api/admin/affiliates/payouts/[batchId]/export.csv`

### Scripts
- `scripts/affiliate-audit.ts` prints last 50 referrals with full timeline and anomalies.
- `scripts/affiliate-smoke.ts` simulates referral -> qualified -> payable -> paid.

Run:
- `npx tsx scripts/affiliate-audit.ts`
- `npx tsx scripts/affiliate-smoke.ts`

## Verification Steps
1) Referral link -> signup
   - Visit `/[slug]` and sign up.
   - Check `Referral` row with `signedUpAt`, `referredEmail/name`, `status=SIGNED_UP` or `TRIAL`.
2) Stripe payment success
   - Trigger `invoice.payment_succeeded`.
   - Expect referral `qualifiedAt`, `commissionAmountCents`, `payableAt`, `status=QUALIFIED`.
3) Cron payable transition
   - Call `/api/cron/affiliate-payables?secret=...`.
   - Expect status change QUALIFIED -> PAYABLE.
4) Admin payout batch
   - Create batch from `/admin/affiliates/payouts`.
   - Mark batch paid and verify referral status = PAID + paidAt.

## DB Queries (Quick Checks)
- Find payable referrals:
  - `SELECT id, "referrerId", "commissionAmountCents", "payableAt" FROM "Referral" WHERE status='PAYABLE';`
- Find missing timeline data:
  - `SELECT id FROM "Referral" WHERE "referredUserId" IS NOT NULL AND "signedUpAt" IS NULL;`
