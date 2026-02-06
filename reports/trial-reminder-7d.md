# Trial 7-Day Reminder Audit

## Audit Findings (Phase 0)

### Email utilities
- `src/lib/email.ts` provides `sendEmail()` (SMTP via `EMAIL_SERVER`/`EMAIL_FROM`) and template senders like `sendSignupAlertEmail()` that target Coen by default.
- Email templates live under `src/lib/templates/` (e.g. `signup-alert.ts`, `welcome.ts`, `welcome-trial.ts`).
- Daily updates are sent via `src/lib/email-templates.ts` using the same `sendEmail()` helper.

### Cron patterns
- Cron routes live under `app/api/cron/*` with secret auth via `VERCEL_CRON_SECRET` and the `x-vercel-cron` header.
- Example patterns:
  - `app/api/cron/trial-expiry/route.ts`
  - `app/api/cron/email-outbox/route.ts`
- Job lock pattern uses `RoiDashboardSnapshot` as a lock table (scope + portfolioKey unique), with TTL handling:
  - `src/lib/jobs/trial-expiry.ts`

### Prisma models
- `Membership` model (status string, `currentPeriodEnd`, `userId`), unique by `userId`:
  - `prisma/schema.prisma` (model `Membership`)
- Email logging/outbox tables exist:
  - `EmailOutbox`, `EmailLog` in `prisma/schema.prisma`

## Plan
- Add a dedicated `TrialReminderLog` table for idempotent reminder logging.
- Implement job helper and cron route for the daily digest email to Coen.
- Add template + send helper using existing email infrastructure.
- Add schedule in `vercel.json`.
- Add smoke script and update this report with verification steps.

## Implementation Notes

### Data model
- Added `TrialReminderLog` with unique constraint on `(reminderType, membershipId, periodEnd)`:
  - `prisma/schema.prisma`
  - Migration: `prisma/migrations/20260206120000_add_trial_reminder_log/migration.sql`

### Job logic
- Job helper: `src/lib/jobs/trial-reminder-7d.ts`
  - Uses UTC window: target day = `today + 7 days` (00:00 -> 23:59 UTC).
  - Idempotency:
    - Per-membership logging in `TrialReminderLog`.
    - Digest lock stored in `RoiDashboardSnapshot` with scope `TRIAL_REMINDER_7D_DIGEST` and key = `YYYY-MM-DD`.
  - Only sends a single digest per day and skips if already sent.

### Email
- Template: `src/lib/templates/trial-7days-digest.ts`
- Sender helper: `src/lib/email.ts` (`sendTrialReminderDigestEmail`)
- Recipient: `COEN_ALERT_EMAIL` (optional), fallback `coen@stewartandco.org`.
  - Env schema updated in `src/lib/env.ts`

### Cron
- Route: `app/api/cron/trial-reminder-7d/route.ts`
- Schedule: `vercel.json` (daily at 09:00 UTC)

### Smoke test
- `scripts/trial-reminder-7d-smoke.ts`
  - Creates a trial ending in 7 days, runs the job twice, verifies idempotency.

## How to Run

### Manual cron invocation
`GET /api/cron/trial-reminder-7d?secret=VERCEL_CRON_SECRET`

### Script
```bash
npx tsx scripts/trial-reminder-7d-smoke.ts
```

## Verification checklist
- New `TrialReminderLog` rows appear for eligible trials.
- Digest email arrives once per day with users ending in 7 days.
- Re-running the cron the same day does not send another digest.
