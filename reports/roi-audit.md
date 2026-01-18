# ROI Pipeline Audit Report

Generated: 2026-01-18

## 1) Failing Condition ("ROI dashboard unavailable")

Before fixes, the ROI panel rendered the "not available" state when either:
- `error || !data` OR `data.navSeries.length === 0` in `src/components/roi-dashboard/PortfolioRoiPanel.tsx`

That meant any empty NAV series (including normal "waiting for cron" cases) displayed "unavailable."

## 2) /api/roi HTTP Responses (local smoke)

Command:
- `npx tsx scripts/roi-smoke.ts`

Output (2026-01-18, with `DATABASE_URL` set to Neon):
```json
{
  "generatedAt": "2026-01-18T13:24:12.454Z",
  "results": [
    {
      "label": "http://localhost:3000/api/roi",
      "status": 200,
      "body": {
        "portfolioKey": "t2_majors_conservative",
        "status": "ok",
        "needsRecompute": false,
        "asOfDate": "2026-01-18",
        "lastComputedAt": "2026-01-18T13:21:05.484Z",
        "lastSignalDate": "2026-01-18",
        "lastPriceDate": "2026-01-18",
        "navSeries": [
          {
            "date": "2026-01-14",
            "nav": 100
          },
          {
            "date": "2026-01-15",
            "nav": 96.7629983383305
          },
          {
            "date": "2026-01-16",
            "nav": 97.4057653384321
          },
          {
            "date": "2026-01-17",
            "nav": 96.9679324242732
          },
          {
            "date": "2026-01-18",
            "nav": 96.3474531284049
          }
        ],
        "kpis": {
          "roi_inception": -3.6525468715951,
          "roi_30d": -3.6525468715951,
          "max_drawdown": -3.6525468715951,
          "as_of_date": "2026-01-18"
        },
        "lastRebalance": {
          "effective_date": "2026-01-18",
          "allocations": [
            {
              "asset": "SUI",
              "weight": 0.6
            },
            {
              "asset": "SOL",
              "weight": 0.3
            },
            {
              "asset": "TRX",
              "weight": 0.1
            }
          ]
        }
      }
    },
    {
      "label": "http://localhost:3000/api/roi?portfolioKey=dashboard",
      "status": 200,
      "body": {
        "portfolioKey": "dashboard",
        "status": "error",
        "needsRecompute": false,
        "asOfDate": null,
        "lastComputedAt": null,
        "lastSignalDate": null,
        "lastPriceDate": null,
        "navSeries": [],
        "kpis": {
          "roi_inception": null,
          "roi_30d": null,
          "max_drawdown": null,
          "as_of_date": null
        },
        "lastRebalance": null
      }
    },
    {
      "label": "http://localhost:3000/api/roi?portfolioKey=t2_memecoins_conservative",
      "status": 200,
      "body": {
        "portfolioKey": "t2_memecoins_conservative",
        "status": "updating",
        "needsRecompute": false,
        "asOfDate": null,
        "lastComputedAt": null,
        "lastSignalDate": "2026-01-18",
        "lastPriceDate": null,
        "navSeries": [],
        "kpis": {
          "roi_inception": null,
          "roi_30d": null,
          "max_drawdown": null,
          "as_of_date": null
        },
        "lastRebalance": null
      }
    }
  ]
}
```

Notes:
- `/api/roi` now returns status metadata; the default portfolio has `status: ok` with NAV and KPIs.
- The `dashboard` key stays error because it is the admin-only cache scope (separate from portfolio ROI).

## 3) DB Evidence (Prisma audit)

Command:
- `node scripts/roi-audit.js`

Output (before run, 2026-01-17, with `DATABASE_URL` set to Neon):
```json
{
  "generatedAt": "2026-01-17T15:36:56.620Z",
  "startOfYear": "2026-01-01T00:00:00.000Z",
  "signalCountSinceJan1": 51,
  "allocationSummary": [
    {
      "key": "t1_majors_conservative",
      "count": 4,
      "latestAsOfDate": "2026-01-17"
    },
    {
      "key": "t2_majors_conservative",
      "count": 4,
      "latestAsOfDate": "2026-01-17"
    }
  ],
  "navSummary": [],
  "priceSummary": [],
  "snapshotSummary": [
    {
      "key": "t1_majors_conservative",
      "needsRecompute": true,
      "recomputeFromDate": "2026-01-12",
      "lastComputedAt": null,
      "asOfDate": null,
      "updatedAt": "2026-01-17T00:00:30.299Z"
    },
    {
      "key": "t2_majors_conservative",
      "needsRecompute": true,
      "recomputeFromDate": "2026-01-12",
      "lastComputedAt": null,
      "asOfDate": null,
      "updatedAt": "2026-01-17T00:00:59.370Z"
    }
  ]
}
```

Output (after run, 2026-01-18, with `DATABASE_URL` set to Neon):
```json
{
  "generatedAt": "2026-01-18T13:21:15.108Z",
  "startOfYear": "2026-01-01T00:00:00.000Z",
  "signalCountSinceJan1": 54,
  "allocationSummary": [
    {
      "key": "t1_majors_conservative",
      "count": 5,
      "latestAsOfDate": "2026-01-18"
    },
    {
      "key": "t2_majors_conservative",
      "count": 5,
      "latestAsOfDate": "2026-01-18"
    }
  ],
  "navSummary": [
    {
      "key": "t1_majors_conservative",
      "count": 5,
      "latestDate": "2026-01-18"
    },
    {
      "key": "t2_majors_conservative",
      "count": 5,
      "latestDate": "2026-01-18"
    }
  ],
  "priceSummary": [
    {
      "key": "BTC",
      "count": 9,
      "latestDate": "2026-01-18"
    },
    {
      "key": "ETH",
      "count": 9,
      "latestDate": "2026-01-18"
    },
    {
      "key": "SOL",
      "count": 9,
      "latestDate": "2026-01-18"
    },
    {
      "key": "SUI",
      "count": 9,
      "latestDate": "2026-01-18"
    },
    {
      "key": "TRX",
      "count": 9,
      "latestDate": "2026-01-18"
    },
    {
      "key": "XRP",
      "count": 9,
      "latestDate": "2026-01-18"
    }
  ],
  "snapshotSummary": [
    {
      "key": "t1_majors_conservative",
      "needsRecompute": false,
      "recomputeFromDate": null,
      "lastComputedAt": "2026-01-18T04:04:55.608Z",
      "asOfDate": "2026-01-18",
      "updatedAt": "2026-01-18T04:04:55.610Z"
    },
    {
      "key": "t2_majors_conservative",
      "needsRecompute": false,
      "recomputeFromDate": null,
      "lastComputedAt": "2026-01-18T13:21:05.484Z",
      "asOfDate": "2026-01-18",
      "updatedAt": "2026-01-18T13:21:05.487Z"
    }
  ]
}
```

Result:
- `MODEL_NAV` rows now exist for both portfolios (see `navSummary`).
- Daily prices are present for BTC/ETH/SOL/SUI/TRX/XRP (see `priceSummary`).
- Portfolio snapshots now show `needsRecompute=false` with `asOfDate`/`lastComputedAt` set.

## 4) Job Evidence

Cron endpoint:
- `app/api/cron/portfolio-roi/route.ts` enforces `VERCEL_CRON_SECRET` unless `x-vercel-cron: 1` is present (added for Vercel cron).

Scheduling:
- No cron schedule existed previously in `vercel.json`. A 15-minute schedule has now been added in `vercel.json`.

Provider/logging:
- Price ingestion via `src/lib/prices/provider.ts` logs missing mappings or provider gaps with `logger.warn`.
- NAV compute in `src/lib/jobs/portfolio-roi.ts` logs missing prices and recompute errors.
- Logs are console-only; there is no local log file in the repo.

Invocation:
- Publish now triggers `/api/cron/portfolio-roi` asynchronously (non-blocking).
- Admin backfill endpoint exists at `POST /api/admin/roi/backfill` for on-demand runs.

Manual run logs (2026-01-18, `npx tsx scripts/run-portfolio-roi.ts`):
```
[INFO] Portfolio ROI job found dirty portfolios { ... count: 1, portfolioKeys: ["t2_majors_conservative"] }
[INFO] Portfolio ROI recompute context { ... symbols: ["SUI","SOL","XRP","ETH","TRX"], startDate: "2026-01-12", endDate: "2026-01-18" }
[INFO] Price provider request { provider: "coingecko", symbol: "SUI", providerId: "sui", ... }
[INFO] Price ingest summary { symbol: "SUI", requested: 9, inserted: 9, updated: 0, ... }
[INFO] NAV series computed { portfolioKey: "t2_majors_conservative", computedDays: 5, writtenRows: 5 }
```

## 5) PortfolioKey Correctness

Publish path:
- `app/api/admin/portfolio-daily-signals/route.ts` and `[id]/route.ts` call `buildPortfolioKey` from `src/lib/portfolio/portfolio-key.ts`.
- Example: tier `T2`, category `majors`, riskProfile `CONSERVATIVE` -> `t2_majors_conservative`.

Read path:
- `src/components/roi-dashboard/PortfolioRoiPanel.tsx` calls `/api/roi` with no `portfolioKey`.
- `/api/roi` uses `getDefaultPortfolioKey` (latest signal + membership tier) and lowercases the key.

Special cases:
- The admin ROI dashboard uses `portfolioKey='dashboard'` via `src/lib/roi-dashboard/data.ts` and seed data. This does not power the portfolio ROI endpoint and is a separate cache scope.

## 6) Date Correctness

UTC alignment:
- Daily signal publish stores `asOfDate` at UTC midnight (daily signal routes).
- NAV computation uses UTC dates (`toUtcDate`, `toDateKey`) and price range is computed in UTC.

NAV day-1:
- NAV series starts after a prior day price exists; missing prices are now forward-filled to avoid dropping all days.

## 7) Caching Correctness

Portfolio ROI:
- `/api/roi` uses `scope='PORTFOLIO'` snapshots keyed by `portfolioKey` and returns portfolio-scoped data.
- Dashboard ROI (admin) uses `scope='DASHBOARD'` and `portfolioKey='dashboard'` for a separate cache.

Fixes added:
- `/api/roi` now returns explicit status fields so the UI can avoid "unavailable" for transient states.

---

# Root Cause(s)

1) **Recompute never executes, so NAV and prices remain empty**
   - `navSummary` and `priceSummary` are empty while `needsRecompute=true` for portfolio snapshots (see audit output above).
   - `/api/roi` returns empty `navSeries` and `kpis: null` for multiple portfolio keys.

2) **No reliable recompute trigger after publish**
   - Daily signals mark `RoiDashboardSnapshot.needsRecompute=true`, but there was no scheduled cron in `vercel.json` and no publish-time "kick."

3) **ROI panel treated empty NAV as "unavailable"**
   - `PortfolioRoiPanel` rendered the unavailable state when `navSeries` was empty, even if recompute was simply pending.

# Fixes Implemented

1) **Status-aware /api/roi**
   - Added `status`, `needsRecompute`, `asOfDate`, `lastComputedAt`, `lastSignalDate`, and `lastPriceDate`.
   - Implements `ok | updating | stale | error` with clear rules.
   - Path: `app/api/roi/route.ts`.

2) **UI handling of updating/stale**
   - Portfolio ROI panel shows last known series + "Updating" badge for `updating` or `stale`.
   - Only shows error message for `status='error'`.
   - Path: `src/components/roi-dashboard/PortfolioRoiPanel.tsx`.

3) **Publish-time recompute kick**
   - Added non-blocking trigger to `/api/cron/portfolio-roi` after publish/edit.
   - Paths:
     - `app/api/admin/portfolio-daily-signals/route.ts`
     - `app/api/admin/portfolio-daily-signals/[id]/route.ts`

4) **Cron schedule + authorization**
   - Added Vercel cron schedule every 15 minutes.
   - Cron endpoint accepts `x-vercel-cron: 1` or `secret`.
   - Paths:
     - `vercel.json`
     - `app/api/cron/portfolio-roi/route.ts`

5) **Job hardening**
- Added DB-based lock to avoid overlapping runs.
- Stale lock detection after 30 minutes (lock stealing with holder/run metadata).
- Forward-fill NAV when prices are missing (keep last known NAV).
- Per-portfolio error isolation (no single failure breaks all portfolios).
- Path: `src/lib/jobs/portfolio-roi.ts`.

6) **Diagnostics endpoint**
   - Admin-only `/api/admin/roi/diagnostics?portfolioKey=...`.
   - Returns latest signal, allocation, NAV, price dates, and snapshot flags.
- Path: `app/api/admin/roi/diagnostics/route.ts`.

7) **Instrumentation + backfill**
- Structured logs for cron gating, lock acquisition, price ingestion, and NAV writes.
- Admin-only backfill endpoint for on-demand recompute.
- Paths:
  - `app/api/cron/portfolio-roi/route.ts`
  - `src/lib/jobs/portfolio-roi.ts`
  - `src/lib/prices/provider.ts`
  - `app/api/admin/roi/backfill/route.ts`

# Definition of Done (Evidence)

After run evidence:
- `node scripts/roi-audit.js` shows price rows and `MODEL_NAV` rows for both `t1_majors_conservative` and `t2_majors_conservative`, with `needsRecompute=false` and `asOfDate` set (see DB evidence above).
- `npx tsx scripts/roi-smoke.ts` shows `/api/roi` returning `status: ok`, populated `navSeries`, and KPIs for the default portfolio.
- The job logs show price ingestion and NAV writes for the recomputed portfolio.
