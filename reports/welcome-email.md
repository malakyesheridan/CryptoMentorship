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
  - Enqueues welcome email via outbox (idempotent)
  - Emits a future marketing event (`emitEvent`) for Klaviyo
- Email outbox: `src/lib/email-outbox.ts` (kept as a standalone file because `src/lib/email.ts` already exists)
  - `enqueueEmail` inserts into `EmailOutbox` with unique `idempotencyKey`
  - `processEmailOutboxBatch` claims queued jobs, sends, writes `EmailLog`
- Email template: `src/lib/templates/welcome-trial.ts`
- Event emitter: `src/lib/events/index.ts` (in-app events are now in `src/lib/events/notifications.ts`)
- Cron worker: `app/api/cron/email-outbox/route.ts`
  - Runs via Vercel cron every 10 minutes (see `vercel.json`)

## Idempotency
- Outbox row key: `idempotencyKey = welcome_trial:<userId>`
- Unique constraint prevents duplicates across retries and multi-trigger calls.

## Cron schedule
- `vercel.json` -> `/api/cron/email-outbox` every 10 minutes
- Auth: same pattern as trial-expiry (Vercel cron header or `?secret=`)

## Events provider
- `EVENTS_PROVIDER=noop|klaviyo` (default: `noop`)

## Manual processing
- Hit: `/api/cron/email-outbox?secret=<VERCEL_CRON_SECRET>`

## Verification steps

### DB checks
```sql
-- Latest welcome email job
SELECT id, userId, toEmail, type, status, attempts, scheduledFor, sentAt, idempotencyKey
FROM "EmailOutbox"
WHERE type = 'WELCOME_TRIAL'
ORDER BY createdAt DESC
LIMIT 10;

-- Idempotency check
SELECT idempotencyKey, COUNT(*)
FROM "EmailOutbox"
WHERE type = 'WELCOME_TRIAL'
GROUP BY idempotencyKey
HAVING COUNT(*) > 1;

-- Sent log
SELECT id, userId, toEmail, type, sentAt
FROM "EmailLog"
WHERE type = 'WELCOME_TRIAL'
ORDER BY sentAt DESC
LIMIT 10;
```

### Smoke
- Run: `node scripts/welcome-email-smoke.ts`
- Expected: single outbox row, then sent status + log entry

## Notes
- Existing daily update email system remains unchanged (still uses `sendDailySignalEmail`).
- Legacy trial notification email is no longer sent directly; replaced by outbox flow.

