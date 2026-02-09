# Learning Track Reliability Audit (2026-02-09)

## Root causes found
1. Track creation used server actions (`createTrack`) that threw raw `Error` messages (including slug conflicts), so the UI had no structured error handling and could surface opaque failures.
2. No slug availability endpoint existed for tracks, so collisions were detected too late and only after submit.
3. Admin learning API routes were not consistently retrying transient DB failures and did not map Prisma connection outages (`P1001`/connection resets) to explicit `503 db_unreachable` responses.
4. Audit writes were still coupled too tightly to request flow in learning endpoints; failures could add noise and obscure root causes.
5. Cron unauthorized probes logged at warning/info invocation levels, adding unrelated noise while debugging admin learning issues.

## Files touched
- `app/api/admin/learning-tracks/route.ts`
- `app/api/admin/learning-tracks/slug-available/route.ts`
- `app/api/health/db/route.ts`
- `app/api/admin/learn/tracks/[trackId]/route.ts`
- `app/api/admin/learn/sections/[sectionId]/route.ts`
- `app/api/admin/learn/lessons/[lessonId]/route.ts`
- `app/api/admin/learn/lessons/upload/route.ts`
- `app/api/admin/learning/diagnostics/route.ts`
- `app/api/upload/learning/route.ts`
- `src/lib/db/retry.ts`
- `src/lib/db/errors.ts`
- `src/lib/learning/track-slug.ts`
- `src/lib/audit.ts`
- `src/lib/env.ts`
- `src/lib/prisma.ts`
- `src/types/env.d.ts`
- `env.example`
- `app/admin/learn/tracks/new/page.tsx`
- `app/admin/learn/tracks/page.tsx`
- `src/components/admin/learning/DbHealthBanner.tsx`
- `src/components/learning/SimpleTrackUpload.tsx`
- `app/api/cron/trial-reminder-7d/route.ts`
- `app/api/cron/trial-expiry/route.ts`
- `app/api/cron/email-outbox/route.ts`
- `app/api/cron/affiliate-payables/route.ts`
- `app/api/cron/portfolio-roi/route.ts`
- `scripts/db-smoke.ts`
- `scripts/learning-track-smoke.ts`
- `package.json`

## What changed
1. Added dedicated admin track APIs:
   - `POST /api/admin/learning-tracks` for robust track creation.
   - `GET /api/admin/learning-tracks/slug-available?slug=...` for inline slug checks + suggestions.
2. Added DB health endpoint:
   - `GET /api/health/db` runs `SELECT 1`, returns `{ ok: true }` or structured `{ ok: false, code: "db_unreachable", ... }`.
3. Added transient DB retry utility:
   - Retries `P1001`, `ECONNRESET`, `ETIMEDOUT`, and `"server closed the connection unexpectedly"` with backoff `250ms -> 750ms -> 1500ms` (max 4 attempts).
4. Added structured Prisma route errors:
   - `db_unreachable` now returns `503` with actionable message.
5. Updated admin track creation UIs:
   - `app/admin/learn/tracks/new/page.tsx` now uses API route (not server action), debounced slug validation, inline status, suggestion apply, pre-submit DB health check, and clean error messaging.
   - `src/components/learning/SimpleTrackUpload.tsx` now uses the same API path + health check + slug collision handling.
6. Audit logging hardened:
   - `logAudit` remains non-blocking and now emits structured failure context (`actorId`, `action`, `subjectType`, `errorCode`).
   - Learning upload completion audit switched to fire-and-forget (`void logAudit(...)`), so it cannot block request success.
   - Lesson upload route moved audit logging out of transaction path.
7. Neon/Prisma env hardening:
   - `DIRECT_URL` validation added.
   - Production validation enforces `DATABASE_URL` and non-pooler `DIRECT_URL` when using Neon pooler.
   - Prisma URL normalization ensures pooler URLs include `sslmode=require`, `pgbouncer=true`, and sane connection defaults.
   - Startup logs now include sanitized DB host/flags only (no credentials).
8. Cron noise reduced:
   - Unauthorized cron probes downgraded from warning-noise patterns to low-noise info/debug context.

## Verification steps
### Automated smoke scripts
1. Run DB smoke:
   - `npm run smoke:db`
2. Run learning track smoke (requires running app + valid auth secret):
   - `npm run smoke:learning-track`
   - Verifies DB health, collision `409 slug_taken` + suggestion, and successful create path.

### Manual checks
1. Slug collision UX:
   - Go to `/admin/learn/tracks/new`.
   - Enter a title/slug that already exists.
   - Confirm inline `Taken` state and `Use suggestion` action appear.
   - Submit and confirm server `409` auto-applies suggested slug instead of crashing.
2. DB outage UX:
   - Temporarily break `DATABASE_URL` in dev.
   - Reload admin learning screens.
   - Confirm health banner appears and create attempts return clean `db_unreachable` message (no stack trace).
3. Upload token + audit isolation:
   - Request learning upload token and perform upload flow.
   - Confirm endpoint still succeeds when audit write fails (check logs for non-blocking audit failure entry).
4. Cron noise:
   - Hit cron routes without secret.
   - Confirm response still `401` but logs are downgraded to non-intrusive noise entries.

## Notes
- `npm run typecheck` currently fails from pre-existing unrelated Prisma typing issues in affiliate/trial-reminder modules. No new type errors were introduced by this learning-track fix set.
