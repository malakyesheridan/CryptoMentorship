# Welcome / Trial Started Email

## Phase 0 - Audit

### Existing email infrastructure
- Sender: `src/lib/email.ts` (nodemailer SMTP; logs instead of sending in dev when not configured).
- Daily update emails: `src/lib/jobs/send-signal-emails.ts` -> `src/lib/email-templates.ts` (`sendDailySignalEmail`).
- Trial notification template (legacy): `src/lib/email-templates.ts` (`sendTrialNotificationEmail`) previously used by admin trial flows.

### Trial creation points
- Registration with trial: `app/api/auth/register/route.ts` (creates Membership with `status='trial'`, sets `currentPeriodStart` + `currentPeriodEnd`).
- Admin create trial: `app/api/admin/trials/route.ts` (upserts Membership to `status='trial'`, sets period start/end).
- Admin create user with trial: `app/api/admin/users/create/route.ts` (creates Membership with `status='trial'`, sets period start/end).
- Stripe trialing subscription: `app/api/stripe/webhook/route.ts` (`customer.subscription.updated` sets Membership status to `trial`).
- Client onboarding invite: `src/lib/client-onboarding.ts` (creates trial Membership for invited users).

### Membership fields used
- `Membership.status`
- `Membership.currentPeriodStart`
- `Membership.currentPeriodEnd`
- `Membership.tier`

## System map (new)

- Trial start hook: `src/lib/membership/trial.ts` (`onTrialStarted`)
  - Guards on `status === 'trial'` and `currentPeriodEnd` in the future
  - Sends welcome email directly (non-blocking)
  - Emits a future marketing event (`emitEvent`) for Klaviyo
- Email template: `src/lib/templates/welcome.ts`
- Event emitter: `src/lib/events/index.ts` (in-app events are now in `src/lib/events/notifications.ts`)

## Idempotency
- Direct send mode does not provide database-level idempotency. (This mirrors the previous verify-email behavior.)

## Events provider
- `EVENTS_PROVIDER=noop|klaviyo` (default: `noop`)

## Verification steps

### DB checks
```sql
-- Recent users
SELECT id, email, name, createdAt
FROM "User"
ORDER BY createdAt DESC
LIMIT 10;
```

### Smoke
- Run: `node scripts/welcome-email-smoke.ts`
- Expected: direct SMTP send (same path as verification email)

## Notes
- Existing daily update email system remains unchanged (still uses `sendDailySignalEmail`).
- Legacy trial notification email is no longer sent directly; replaced by outbox flow.

