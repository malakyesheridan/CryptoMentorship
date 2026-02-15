# Notifications Email Audit

## Scope
Audit goal: ensure email is sent for each notification type based on Notification Preferences, with server-side preference gating, idempotent outbox enqueue, and secured cron draining.

Date: 2026-02-15

## A1) Notification Preferences UI

### UI location
- `app/(app)/account/page.tsx`
  - Renders `<NotificationPreferences />`.
- `src/components/NotificationPreferences.tsx`
  - Renders channels:
    - In-App Notifications
    - Email Notifications
  - Renders notification type toggles:
    - Portfolio Updates
    - Crypto Compass
    - Learning Hub
    - Community Mentions
    - Community Replies
  - Renders Digest Settings (coming soon, disabled).

### API endpoint used by toggles
- `GET /api/me/notification-preferences`
- `POST /api/me/notification-preferences`
- Route file: `app/api/me/notification-preferences/route.ts`

### DB fields read/written
Canonical fields (now used):
- `inAppEnabled`
- `emailEnabled`
- `portfolioUpdatesEmail`
- `cryptoCompassEmail`
- `learningHubEmail`
- `communityMentionsEmail`
- `communityRepliesEmail`
- `digestEnabled`
- `digestFreq`
- `digestHourUTC`

Legacy compatibility fields (kept in sync):
- `inApp`
- `email`
- `onSignal`
- `onEpisode`
- `onResearch`
- `onMention`
- `onReply`

## A2) Data Model

### Notification preferences
- Model: `NotificationPreference`
- File: `prisma/schema.prisma`
- Key: `userId` (1:1 with `User`)

Current defaults:
- `emailEnabled`: `true`
- `inAppEnabled`: `true`
- All per-type email toggles: `true`
- Digest disabled by default.

### In-app notifications
- Model: `Notification`
- File: `prisma/schema.prisma`
- Stores notification records (`channel` includes `inapp` / `email` / `push`).

### Outbox / queue
- Model: `EmailOutbox`
- File: `prisma/schema.prisma`
- Relevant fields:
  - `toEmail`
  - `type` (`EmailType` enum)
  - `payload` (JSON)
  - `status` (`QUEUED` | `SENDING` | `SENT` | `FAILED`)
  - `attempts`
  - `lastError`
  - `scheduledFor`
  - `sentAt`
  - `idempotencyKey` (legacy unique)
  - `dedupeKey` (new unique)

### Migration added in this work
- `prisma/migrations/20260215103000_notification_email_preferences_and_dedupe/migration.sql`
  - Adds notification email enum values.
  - Adds canonical preference fields.
  - Backfills canonical fields from legacy fields.
  - Adds `EmailOutbox.dedupeKey` and unique index.

## A3) Event Sources That Generate Emails

### Portfolio Updates
- Producer trigger paths:
  - `app/api/admin/portfolio-daily-signals/route.ts`
  - `app/api/admin/portfolio-daily-signals/[id]/route.ts`
  - Both trigger `/api/cron/signal-emails`.
- Job:
  - `src/lib/jobs/send-signal-emails.ts`
- Current behavior:
  - Resolves recipients via centralized preference gate.
  - Enqueues outbox rows (no direct SMTP send).
  - Uses idempotent dedupe key per `portfolio_update:{signalId}:user:{userId}`.

### Crypto Compass
- Producer path:
  - `app/api/admin/episodes/route.ts` emits `episode_published`.
  - `src/lib/jobs/publish.ts` emits for scheduled episodes.
- Handler:
  - `src/lib/events/notifications.ts`
- Current behavior:
  - Creates in-app notifications.
  - Enqueues email outbox rows for eligible users.

### Learning Hub
- Producer paths:
  - `app/api/admin/content/route.ts` (resource publish now emits learning_hub event)
  - `app/api/admin/learning-tracks/route.ts` (track publish)
  - `app/api/admin/learn/lessons/upload/route.ts` (lesson publish)
  - `src/lib/jobs/publish.ts` (scheduled resource publish)
- Handler:
  - `src/lib/events/notifications.ts` (`learning_hub_published`)
- Current behavior:
  - Creates in-app notifications.
  - Enqueues email outbox rows for eligible users.

### Community Mentions
- Producer path:
  - `app/api/community/messages/route.ts`
  - Resolves `mentionedUserIds` (explicit list + `@token` name resolution), emits `mention`.
- Handler:
  - `src/lib/events/notifications.ts`
- Current behavior:
  - Creates in-app notifications.
  - Enqueues email outbox rows for eligible users.

### Community Replies
- Producer path:
  - `app/api/community/messages/route.ts`
  - Accepts `replyToMessageId`, emits `reply` to parent author.
- Handler:
  - `src/lib/events/notifications.ts`
- Current behavior:
  - Creates in-app notification.
  - Enqueues email outbox row for eligible recipient.

Reply rule implemented:
- Notify replied-to message author only (excluding self-replies).

## A4) Email Sending Pipeline

### Outbox writer
- New module: `src/lib/email/outbox.ts`
- API:
  - `enqueueEmail({ to, templateKey, subject, variables, dedupeKey, userId? })`
- Legacy compatibility:
  - Existing `src/lib/email-outbox.ts` now re-exports new module.

### Outbox consumer
- Cron route: `app/api/cron/email-outbox/route.ts`
- Batch drain logic: `processEmailOutboxBatch({ limit: 50 })`
- Claims rows via DB lock pattern:
  - `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED ...)`
- Retry behavior:
  - Failed sends increment `attempts`
  - Backoff via `scheduledFor`
  - Marks `FAILED` at max attempts.

### Cron authorization
- Fixed to support Vercel Authorization header pattern:
  - `Authorization: Bearer <VERCEL_CRON_SECRET>`
- Also supports query secret fallback for manual/internal calls.
- Production behavior:
  - Fails with 500 if cron secret missing.

## Centralized Preference Gate

New module:
- `src/lib/notifications/preferences.ts`

Exposes:
- `getNotificationPrefs(userId)`
- `canSendEmail(userId, type)`
- `resolveEmailRecipientsForEvent(event)`

Also used:
- `canSendEmailFromPrefs(type, prefs)` for producer-level filtering without repeated DB lookups.

## Standard Notification Event Interface

New module:
- `src/lib/notifications/types.ts`

Defines:
- `NotificationEvent`:
  - `type`
  - `subjectId`
  - `actorId`
  - `recipientUserId`
  - `metadata`
- Dedupe helper:
  - `buildNotificationDedupeKey(event, recipientUserId)`

## Gaps Found (Before Changes)

1. Preference checks were inconsistent:
- Per-type defaults mismatched between schema and API-created defaults.
- Email checks were partially hardcoded in portfolio sender.

2. Email pipeline inconsistency:
- Portfolio update job sent SMTP directly.
- Other notification types (episode/learning/community) had no email enqueue path.

3. Producer gaps:
- Community message creation did not emit mention/reply events.
- Learning track/lesson/resource publish paths were not consistently emitting learning-hub notifications.

4. Cron auth mismatch:
- Outbox cron did not validate Vercel Authorization header pattern directly.

## Implemented Changes Summary

- Added canonical email preference fields and centralized preference resolver/gate.
- Added standard internal notification event shape and dedupe-key builder.
- Implemented `src/lib/email/outbox.ts` with template-key enqueue API.
- Extended outbox sender to handle:
  - portfolio update
  - crypto compass
  - learning hub
  - community mention
  - community reply
- Reworked portfolio email job to enqueue outbox only.
- Wired episode/learning/mention/reply producers to enqueue email via outbox.
- Secured outbox cron with Authorization bearer secret pattern.
- Updated Notification Preferences UI:
  - email-type toggles disabled when email channel is disabled
  - saved toast on successful persistence
- Added admin test endpoint:
  - `POST /api/admin/notifications/test`
- Added smoke script:
  - `scripts/notifications-smoke.ts`
  - npm script: `npm run smoke:notifications`

## Verification Notes

Successful:
- `npx prisma generate`
- `npx tsc --noEmit --incremental false`

Blocked in this environment:
- `npx tsx scripts/notifications-smoke.ts`
  - failed due missing `DATABASE_URL` in environment.
