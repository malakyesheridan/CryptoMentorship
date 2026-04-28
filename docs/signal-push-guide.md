# Signal Push API Guide

This endpoint accepts daily signal data from Coen's local trading systems and
fans it out to the platform: persists a `PortfolioDailySignal` row, mirrors a
`StrategyUpdate`, and queues notification emails to every user assigned to the
system.

## Endpoint

```
POST https://stewartandco.com.au/api/ingest/signal
```

## Authentication

Bearer token. The secret is the `INTERNAL_DISPATCH_SECRET` env var on Vercel
(falls back to `NEXTAUTH_SECRET` if unset).

```
Authorization: Bearer <INTERNAL_DISPATCH_SECRET>
Content-Type: application/json
```

The `x-internal-job-token: <secret>` header is also accepted as an alternative,
matching the pattern used by the cron handlers.

## Request bodies

### Rotation signal (DHRS, MRS)

```json
{
  "system": "dhrs",
  "signal_type": "rotation",
  "data": {
    "regime": true,
    "dominant_asset": "BTC",
    "from_asset": "XAUT (Gold)",
    "to_asset": "BTC",
    "allocation": "100% BTC",
    "entry_price": 67500.00,
    "rotation_date": "2026-04-28",
    "commentary": "Optional commentary text."
  }
}
```

`allocation` is required; everything else is optional.

### Zone/action signal (SDCA)

```json
{
  "system": "sdca",
  "signal_type": "zone_action",
  "data": {
    "zone": "FEAR",
    "action": "BUY",
    "composite_z": -0.85,
    "btc_price": 67500.00,
    "allocation_pct": 25,
    "signal_date": "2026-04-28",
    "commentary": "Optional commentary text."
  }
}
```

`zone` and `action` are required; everything else is optional.

## System slugs

| Slug   | System                              | signal_type   |
|--------|-------------------------------------|---------------|
| `dhrs` | Dynamic Hedging Rotation System     | `rotation`    |
| `mrs`  | Majors Rotation System              | `rotation`    |
| `sdca` | Strategic Dollar Cost Averaging     | `zone_action` |

Sending the wrong `signal_type` for a system returns a 400.

## Response

```json
{
  "success": true,
  "system": "dhrs",
  "signal": "100% BTC",
  "portfolioSignalId": "clx...",
  "emailsQueued": 47,
  "ingestId": "clx..."
}
```

`emailsQueued` is the count of `EmailOutbox` rows actually inserted (i.e.,
recipients who don't already have a queued email for the same `system + day`).
Duplicate pushes return `emailsQueued: 0` because the dedupe key
(`signal_<system>_<YYYY-MM-DD>_<userId>`) blocks repeats.

## Error responses

| Status | When                                                                  |
|--------|-----------------------------------------------------------------------|
| 400    | Invalid JSON, validation failed, unknown system, type/format mismatch |
| 401    | Missing or wrong bearer token                                         |
| 500    | Database write failed (no emails are queued in this case)             |

Validation errors include a `details` array with `path` and `message` per issue.

## What happens on a successful push

1. `SystemSignalIngest` row written (audit log of every push).
2. Today's `PortfolioDailySignal` for this system is replaced with the new one
   (idempotent — re-push the same day to overwrite).
3. If a `Strategy` row exists for the slug, a `StrategyUpdate` row is created
   with `notify=true`.
4. `EmailOutbox` rows are queued for every user who:
   - Has an active or trial membership.
   - Has a `UserSystemAssignment` for this system slug with `isActive = true`.
   - Has not disabled `portfolioUpdatesEmail` in their notification preferences.
5. The `/api/cron/email-outbox` cron (every 10 minutes) drains the queue via
   SMTP.
6. The dashboard signals cache is invalidated so `/portfolio` shows the new
   signal immediately.

## Idempotency

The endpoint is safe to call multiple times for the same `system + day`:

- The `PortfolioDailySignal` row is replaced (latest push wins).
- The `EmailOutbox.dedupeKey` blocks duplicate emails for the same recipient.
- A new `SystemSignalIngest` row is written for each call (audit trail).

## Python example

```python
import requests
from datetime import datetime, timezone

API_URL = "https://stewartandco.com.au/api/ingest/signal"
API_SECRET = "your-internal-dispatch-secret"


def push_dhrs_signal(dominant, from_asset, to_asset, allocation, price, commentary=""):
    payload = {
        "system": "dhrs",
        "signal_type": "rotation",
        "data": {
            "regime": True,
            "dominant_asset": dominant,
            "from_asset": from_asset,
            "to_asset": to_asset,
            "allocation": allocation,
            "entry_price": price,
            "rotation_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "commentary": commentary,
        },
    }
    r = requests.post(
        API_URL,
        json=payload,
        headers={
            "Authorization": f"Bearer {API_SECRET}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    print(f"[{r.status_code}] {r.text}")
    r.raise_for_status()
    return r.json()


def push_mrs_signal(dominant, from_asset, to_asset, allocation, price, commentary=""):
    payload = {
        "system": "mrs",
        "signal_type": "rotation",
        "data": {
            "regime": True,
            "dominant_asset": dominant,
            "from_asset": from_asset,
            "to_asset": to_asset,
            "allocation": allocation,
            "entry_price": price,
            "rotation_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "commentary": commentary,
        },
    }
    r = requests.post(API_URL, json=payload, headers={
        "Authorization": f"Bearer {API_SECRET}",
        "Content-Type": "application/json",
    }, timeout=30)
    print(f"[{r.status_code}] {r.text}")
    r.raise_for_status()
    return r.json()


def push_sdca_signal(zone, action, z_score, btc_price, alloc_pct, commentary=""):
    payload = {
        "system": "sdca",
        "signal_type": "zone_action",
        "data": {
            "zone": zone,
            "action": action,
            "composite_z": z_score,
            "btc_price": btc_price,
            "allocation_pct": alloc_pct,
            "signal_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "commentary": commentary,
        },
    }
    r = requests.post(API_URL, json=payload, headers={
        "Authorization": f"Bearer {API_SECRET}",
        "Content-Type": "application/json",
    }, timeout=30)
    print(f"[{r.status_code}] {r.text}")
    r.raise_for_status()
    return r.json()


# Example daily run, after your systems have computed:
# push_dhrs_signal("BTC", "XAUT (Gold)", "BTC", "100% BTC", 67500.00, "Regime turned bullish")
# push_mrs_signal("BTC", "ETH", "BTC", "100% BTC", 67500.00, "Majors momentum favouring BTC")
# push_sdca_signal("FEAR", "BUY", -0.85, 67500.00, 25, "Composite Z in fear zone")
```

## Scheduling

Add to Windows Task Scheduler alongside your existing system-computation tasks.

- Run at **00:30 UTC** daily (08:30 AWST), after your computation jobs finish.
- One task per system, or one wrapper script that calls all three.
- Retry on failure — the endpoint is safe to retry within the same day.

## Local testing

```bash
curl -X POST http://localhost:5000/api/ingest/signal \
  -H "Authorization: Bearer $INTERNAL_DISPATCH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "system": "dhrs",
    "signal_type": "rotation",
    "data": {
      "regime": true,
      "dominant_asset": "BTC",
      "from_asset": "XAUT (Gold)",
      "to_asset": "BTC",
      "allocation": "100% BTC",
      "entry_price": 67500,
      "rotation_date": "2026-04-28",
      "commentary": "Test signal"
    }
  }'
```

In dev (no `EMAIL_SERVER` configured), email sends are logged to the console
instead of going out via SMTP.

## Adding new systems

Adding a new system is a single edit to `src/lib/system-registry.ts` plus the
matching UI components under `src/components/systems/<slug>/`. Once the slug is
in the registry, the ingest endpoint accepts it, the admin UI exposes a
checkbox for it, and the auto-assign helper picks it up on new subscriptions.
