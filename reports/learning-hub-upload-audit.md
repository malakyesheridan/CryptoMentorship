# Learning Hub Upload Audit

Date: 2026-01-23

## 1) Where upload is implemented

UI / admin entry points
- `src/components/learning/TrackEditModal.tsx` (Videos tab renders `LessonVideoUpload`)
- `src/components/learning/LessonVideoUpload.tsx` (client upload flow for lesson videos)
- `src/components/learning/SimpleTrackUpload.tsx` (track creation + cover upload)
- `src/components/learning/PdfAttachmentsField.tsx` (PDF attachments upload)

Client upload utility
- `src/lib/blob-upload.ts` (Learning Hub uploads go through `uploadToBlob()`)

Server endpoints
- `app/api/upload/blob/route.ts` (legacy server upload)
- `app/api/upload/blob-chunk/route.ts` (legacy chunked server upload)
- `app/api/admin/learn/lessons/upload/route.ts` (creates Lesson record with `videoUrl`)
- `app/api/upload/learning/route.ts` (new client-upload token handler + completion hook)
- `app/api/admin/learning/diagnostics/route.ts` (new admin diagnostics endpoint)

Storage provider integration
- Vercel Blob via `@vercel/blob` (server) and `@vercel/blob/client` (client)

Background jobs
- None found for Learning Hub video processing.

Database models
- `Lesson` in `prisma/schema.prisma` (fields: `videoUrl`, `durationMin`, `pdfResources`)
- `Track` in `prisma/schema.prisma` (fields: `coverUrl`, `pdfResources`)
- `Audit` used for upload attempt logging (subjectType `learning_upload`)

## 2) Exact failing requests and responses (before fix)

Repro steps (local dev):
1. Start dev server: `npm run dev:5000`
2. Generate admin JWT using `next-auth/jwt` with role `admin`.
3. Upload a small MP4 (<10MB) to `/api/upload/blob`.
4. Upload a large MP4 (>100MB) via `/api/upload/blob-chunk` (first chunk).

Observed responses:
- `POST /api/upload/blob` → **500**
  - Body: `{"error":"Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.","details":"Get your token from https://vercel.com/dashboard/stores"}`
- `POST /api/upload/blob-chunk` → **500**
  - Body: `{"error":"Vercel Blob Storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.","details":"Get your token from https://vercel.com/dashboard/stores"}`

Server logs (dev):
- `POST /api/upload/blob 500`
- `POST /api/upload/blob-chunk 500`

Browser console logs:
- Not captured during CLI-based reproduction; network responses and server logs show the failure.

## 3) Root cause(s) with evidence

Root cause A — Missing Blob token configuration
- Evidence: both upload endpoints return explicit 500 errors stating `BLOB_READ_WRITE_TOKEN` is not set.
- Evidence: `env.example` did not include `BLOB_READ_WRITE_TOKEN` prior to this fix.

Root cause B — Server upload approach incompatible with large videos on Vercel
- Evidence: `node_modules/@vercel/blob/README.md` states server uploads are limited by Vercel’s 4.5MB request body limit.
- Learning Hub used `/api/upload/blob` and `/api/upload/blob-chunk`, which are server-upload routes; large video uploads are structurally unsafe even if the token is set.

## 4) Fix plan (implemented)

1) **Switch to direct client uploads (presigned/token-based)**
- Replaced `uploadToBlob()` to use `@vercel/blob/client` uploads directly to storage.
- Added `app/api/upload/learning/route.ts` using `handleUpload` to mint client tokens and receive completion callbacks.
- Added strict mime/type + size validation on server and client.

2) **Diagnostics + guardrails**
- New admin endpoint: `GET /api/admin/learning/diagnostics`
  - Provider, bucket name, env presence, max sizes, allowed mime types.
  - Last 10 upload attempts from `Audit` (subjectType `learning_upload`).
- Structured logging around upload token requests, completion, and lesson finalization.

3) **Smoke test**
- New script: `scripts/learning-upload-smoke.ts` to request a token and upload a tiny MP4 blob.

4) **Configuration**
- Added `BLOB_READ_WRITE_TOKEN` placeholder to `env.example`.
- Added `BLOB_READ_WRITE_TOKEN` to env schema validation.

## 5) Verification steps and results

Manual checks (post-fix):
1. Confirm new direct upload path uses `/api/upload/learning`.
2. Ensure client validations block invalid types and oversize files.
3. Verify diagnostics endpoint returns provider + recent attempts.

Smoke test (requires valid Blob token):
- Run: `tsx scripts/learning-upload-smoke.ts`
- Expected: returns a valid Blob URL and path.
- Current status in this environment: **blocked** until `BLOB_READ_WRITE_TOKEN` is configured.

Recommended follow-up:
- Set `BLOB_READ_WRITE_TOKEN` in dev/prod env.
- Re-run smoke test and upload a real MP4 from admin UI to confirm end-to-end playback.
