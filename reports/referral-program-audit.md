# Referral Program Audit — Stewart & Co

Date: 2026-01-27

Scope: Referral attribution, persistence, dashboard correctness, and DB integrity.

## System Map (routes/components/models)
- Referral entry points:
  - `app/[slug]/page.tsx` — root slug handler, sets `referral_code` cookie and redirects to `/register?ref=slug`.
  - `app/ref/[code]/page.tsx` — short link handler, sets `referral_code` cookie and redirects to `/register?ref=code`.
- Registration:
  - `app/(auth)/register/page.tsx` — reads `?ref=` and sets `document.cookie` for `referral_code`.
  - `app/api/auth/register/route.ts` — reads `referral_code` cookie or request body, calls `linkReferralToUser`.
- OAuth attribution:
  - `src/lib/auth.ts` — `events.createUser` reads `referral_code` cookie and calls `linkReferralToUser`.
- Referral dashboard:
  - `app/api/referrals/route.ts` — server-side query by `session.user.id`, returns referral stats + recent referrals with referred user details.
  - `app/(app)/account/referrals/page.tsx` — UI consuming `/api/referrals`.
- Models:
  - `prisma/schema.prisma` — `User` (has `referralSlug`), `Referral`, `Commission`.

## Attribution Mechanism (slug → DB record)
1) User visits a referral link:
   - `/[slug]` or `/ref/[code]` validates code via `validateReferralCode`.
   - Sets `referral_code` cookie for 30 days (non-HttpOnly so the registration UI can also read it).
   - Redirects to `/register?ref=[code]`.
2) User registers:
   - `app/(auth)/register/page.tsx` captures `?ref` and sets `document.cookie` (persistence across navigation).
   - `app/api/auth/register/route.ts` reads `referralCode` body param or cookie and uses `linkReferralToUser`.
3) OAuth signups:
   - `src/lib/auth.ts` uses `events.createUser` to read the referral cookie and link referral after OAuth account creation.
4) DB write:
   - `linkReferralToUser` validates code, prevents self-referral, ensures referred user not already linked, creates a completed referral record referencing the referrer and referred user.

Precedence: **last touch wins** (cookie is overwritten by latest referral click, and register uses cookie/body).

## Findings (Evidence-Based)
- ✅ Referral attribution persists through navigation:
  - Cookie is set by `/[slug]` and `/ref/[code]` handlers and by the register page. This allows attribution to survive browsing before signup.
- ✅ Referral attribution captured on signup:
  - Register API reads cookie/body and calls `linkReferralToUser` in the transaction.
- ✅ OAuth attribution handled:
  - `events.createUser` in `src/lib/auth.ts` links referral from cookie on OAuth account creation.
- ✅ Self-referrals and duplicates prevented:
  - `linkReferralToUser` checks `referrerId !== userId` and checks unique `referredUserId` before insert.
- ✅ Dashboard joins refer to `referredUser`:
  - `/api/referrals` selects `referredUser` fields (email, name, createdAt), enabling correct dashboard display.

## Fixes Applied (If Any)
- **Referral persistence on non-direct signup**:
  - Added cookie fallback in registration handler and set client cookie on register page.
  - Added OAuth `events.createUser` referral link.
  - Cleared `referral_code` cookie after successful registration.

Files:
- `app/api/auth/register/route.ts`
- `app/(auth)/register/page.tsx`
- `src/lib/auth.ts`

## DB Integrity Checks
Use the script to detect broken joins, duplicates, and self-referrals.

Run:
```bash
npx tsx scripts/referral-audit.ts
```

Outputs:
- Total referrals, last 7/30 days
- Self-referrals
- Missing referrer/referred users
- Duplicate referred users
- Last 20 referrals and last 20 signups with referral linkage

Note: Scripts were not executed in this environment; run in staging/prod to capture DB evidence.

## Smoke Test (End-to-End)
Simulates referral link → signup → dashboard visibility.

Run:
```bash
npx tsx scripts/referral-smoke.ts
```

Expected:
- Creates a referrer and referred user
- Links referral via `linkReferralToUser`
- Confirms the referral appears in a dashboard-style query
- Cleans up test data

## Verification Steps
1) Direct referral signup:
   - Visit `/[slug]` in incognito → register.
   - Expect `Referral` record with `referrerId`, `referredUserId`, `status=completed`.
2) Referral persists across navigation:
   - Visit `/[slug]` → browse 2–3 pages → register.
   - Expect same `Referral` record creation.
3) OAuth signup:
   - Visit `/[slug]` → register via OAuth (Google/email).
   - Expect referral linking via `events.createUser`.
4) Dashboard:
   - Visit `/account/referrals` as referrer.
   - Expect referred user name/email/createdAt displayed.

## Known Risks / Open Items
- None identified in code paths, but DB integrity should be confirmed via scripts above in staging/production.
