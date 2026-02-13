# Customer.io Trial Started Integration

## Environment Variables

Set these on your deployment platform and in local `.env`:

```bash
CUSTOMERIO_ENABLED=true
CUSTOMERIO_SITE_ID=your_site_id
CUSTOMERIO_TRACK_API_KEY=your_track_api_key
CUSTOMERIO_REGION=us
```

`CUSTOMERIO_REGION` values:

- `us` -> `https://track.customer.io`
- `eu` -> `https://track-eu.customer.io`

When `CUSTOMERIO_ENABLED=true`, the app validates that all three required Customer.io credentials are present.

## Test Endpoint

Use the admin-only endpoint:

`POST /api/admin/customerio/test-trial-started`

Request body:

```json
{
  "email": "real-user@example.com"
}
```

Example response:

```json
{
  "ok": true,
  "customerio": {
    "identify": { "ok": true, "status": 200 },
    "event": { "ok": true, "status": 200 }
  }
}
```

Behavior:

- Looks up user by email.
- In development only, creates a minimal stub user if not found.
- Sends identify + `trial_started` event using the same payload logic as real trial flow.

## Verify in Customer.io

1. Open **People** in Customer.io.
2. Search by the user identifier (app `user.id`) or email.
3. Open the profile activity feed.
4. Confirm event `trial_started` appears.
5. Confirm attributes include:
   - `email`
   - `name`
   - `membershipStatus = trial`
   - `trialStartAt`
   - `trialEndAt`
   - `trialLengthDays`
