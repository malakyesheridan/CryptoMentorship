# ROI Pipeline Audit Report

Generated: 2026-01-19

## 1) Failing Condition ("ROI dashboard unavailable")

Before fixes, the ROI panel rendered the "not available" state when either:
- `error || !data` OR `data.navSeries.length === 0` in `src/components/roi-dashboard/PortfolioRoiPanel.tsx`

That meant any empty NAV series (including normal "waiting for cron" cases) displayed "unavailable."

## 1b) Primary-only Compute Flow Audit

- Symbol selection: `src/lib/jobs/portfolio-roi.ts` resolves the primary asset from `PortfolioDailySignal.signal` via `parseAllocationAssets`, falls back to the highest-weight item in `AllocationSnapshot`, then maps to a ticker using `src/lib/prices/tickers.ts`.
- AllocationSnapshot read: `prisma.allocationSnapshot.findMany` in `src/lib/jobs/portfolio-roi.ts` and `prisma.allocationSnapshot.findFirst` in `app/api/roi/route.ts`.
- Provider call: `src/lib/prices/provider.ts` maps ticker -> provider id and calls `.../coins/{id}/market_chart/range` with the ticker logged.
- Price storage: `assetPriceDaily.symbol` now stores the ticker (e.g. `SUIUSD`, `XAUTUSD`).
- Evidence: before the primary-only run, `primaryTickerPriceSummary` was empty (no ticker rows), proving why primary-only NAV could not populate (see DB evidence below).

## 2) /api/roi HTTP Responses (local smoke)

Command:
- `npx tsx scripts/roi-smoke.ts`

Output (2026-01-19, with `DATABASE_URL` set to Neon):
```json
{
  "generatedAt": "2026-01-19T10:49:29.934Z",
  "results": [
    {
      "label": "http://localhost:3000/api/roi",
      "status": 200,
      "body": {
        "portfolioKey": "t2_majors_conservative",
        "status": "ok",
        "needsRecompute": false,
        "asOfDate": "2026-01-19",
        "lastComputedAt": "2026-01-19T10:49:04.414Z",
        "lastSignalDate": "2026-01-19",
        "lastPriceDate": "2026-01-19",
        "primarySymbol": "SUI",
        "primaryTicker": "SUIUSD",
        "lastError": null,
        "navSeries": [
          {
            "date": "2026-01-14",
            "nav": 100
          },
          {
            "date": "2026-01-15",
            "nav": 96.3933751001954
          },
          {
            "date": "2026-01-16",
            "nav": 96.6829035790542
          },
          {
            "date": "2026-01-17",
            "nav": 96.2710123238651
          },
          {
            "date": "2026-01-18",
            "nav": 96.5132407466955
          },
          {
            "date": "2026-01-19",
            "nav": 84.8748884674924
          }
        ],
        "kpis": {
          "roi_inception": -15.1251115325076,
          "roi_30d": -15.1251115325076,
          "max_drawdown": -15.1251115325076,
          "as_of_date": "2026-01-19"
        },
        "lastRebalance": {
          "effective_date": "2026-01-19",
          "allocations": [
            {
              "asset": "SUI",
              "weight": 0.6
            },
            {
              "asset": "TRX",
              "weight": 0.3
            },
            {
              "asset": "SOL",
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
        "primarySymbol": null,
        "primaryTicker": null,
        "lastError": null,
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
        "lastSignalDate": "2026-01-19",
        "lastPriceDate": null,
        "primarySymbol": null,
        "primaryTicker": null,
        "lastError": null,
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
- `/api/roi` now returns status metadata plus `primarySymbol`/`primaryTicker`; the default portfolio has `status: ok` with NAV and KPIs.
- The `dashboard` key stays error because it is the admin-only cache scope (separate from portfolio ROI).

## 3) DB Evidence (Prisma audit)

Command:
- `node scripts/roi-audit.js`

Output (before primary-only run, 2026-01-19, with `DATABASE_URL` set to Neon):
```json
{
  "generatedAt": "2026-01-19T06:32:20.268Z",
  "startOfYear": "2026-01-01T00:00:00.000Z",
  "signalCountSinceJan1": 57,
  "allocationSummary": [
    {
      "key": "t1_majors_conservative",
      "count": 6,
      "latestAsOfDate": "2026-01-19"
    },
    {
      "key": "t2_majors_conservative",
      "count": 6,
      "latestAsOfDate": "2026-01-19"
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
  "primaryTickers": [
    "BTCUSD",
    "ETHUSD",
    "SOLUSD",
    "XRPUSD",
    "DOGEUSD",
    "SUIUSD",
    "BNBUSD",
    "TRXUSD",
    "LINKUSD",
    "XAUTUSD",
    "HYPEHUSD",
    "CASHUSD"
  ],
  "primaryTickerPriceSummary": [],
  "priceSample": [],
  "navSample": [
    {
      "portfolioKey": "t1_majors_conservative",
      "date": "2026-01-18",
      "value": "98.096845648298238554018680822424"
    },
    {
      "portfolioKey": "t2_majors_conservative",
      "date": "2026-01-18",
      "value": "96.347453128404896251704260198696"
    },
    {
      "portfolioKey": "t2_majors_conservative",
      "date": "2026-01-17",
      "value": "96.967932424273245787464527573589"
    },
    {
      "portfolioKey": "t1_majors_conservative",
      "date": "2026-01-17",
      "value": "98.38507834360633040325591404682"
    },
    {
      "portfolioKey": "t1_majors_conservative",
      "date": "2026-01-16",
      "value": "98.771818041193464475308138134917"
    }
  ],
  "snapshotSummary": [
    {
      "key": "t1_majors_conservative",
      "needsRecompute": true,
      "recomputeFromDate": "2026-01-17",
      "lastComputedAt": "2026-01-18T04:04:55.608Z",
      "asOfDate": "2026-01-18",
      "updatedAt": "2026-01-19T00:02:00.404Z"
    },
    {
      "key": "t2_majors_conservative",
      "needsRecompute": true,
      "recomputeFromDate": "2026-01-17",
      "lastComputedAt": "2026-01-18T13:21:05.484Z",
      "asOfDate": "2026-01-18",
      "updatedAt": "2026-01-19T00:02:44.321Z"
    }
  ]
}
```

Output (after primary-only run, 2026-01-19, with `DATABASE_URL` set to Neon):
```json
{
  "generatedAt": "2026-01-19T10:49:16.760Z",
  "startOfYear": "2026-01-01T00:00:00.000Z",
  "signalCountSinceJan1": 57,
  "allocationSummary": [
    {
      "key": "t1_majors_conservative",
      "count": 6,
      "latestAsOfDate": "2026-01-19"
    },
    {
      "key": "t2_majors_conservative",
      "count": 6,
      "latestAsOfDate": "2026-01-19"
    }
  ],
  "navSummary": [
    {
      "key": "t1_majors_conservative",
      "count": 6,
      "latestDate": "2026-01-19"
    },
    {
      "key": "t2_majors_conservative",
      "count": 6,
      "latestDate": "2026-01-19"
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
      "key": "SUIUSD",
      "count": 8,
      "latestDate": "2026-01-19"
    },
    {
      "key": "TRX",
      "count": 9,
      "latestDate": "2026-01-18"
    },
    {
      "key": "XAUTUSD",
      "count": 8,
      "latestDate": "2026-01-19"
    },
    {
      "key": "XRP",
      "count": 9,
      "latestDate": "2026-01-18"
    }
  ],
  "primaryTickers": [
    "BTCUSD",
    "ETHUSD",
    "SOLUSD",
    "XRPUSD",
    "DOGEUSD",
    "SUIUSD",
    "BNBUSD",
    "TRXUSD",
    "LINKUSD",
    "XAUTUSD",
    "HYPEHUSD",
    "CASHUSD"
  ],
  "primaryTickerPriceSummary": [
    {
      "key": "SUIUSD",
      "count": 8,
      "latestDate": "2026-01-19"
    },
    {
      "key": "XAUTUSD",
      "count": 8,
      "latestDate": "2026-01-19"
    }
  ],
  "priceSample": [
    {
      "symbol": "XAUTUSD",
      "date": "2026-01-19",
      "close": "4665.563007751339"
    },
    {
      "symbol": "SUIUSD",
      "date": "2026-01-19",
      "close": "1.568826622846469"
    },
    {
      "symbol": "XAUTUSD",
      "date": "2026-01-18",
      "close": "4613.502227110012"
    },
    {
      "symbol": "SUIUSD",
      "date": "2026-01-18",
      "close": "1.783949814539061"
    },
    {
      "symbol": "XAUTUSD",
      "date": "2026-01-17",
      "close": "4598.685512700053"
    }
  ],
  "navSample": [
    {
      "portfolioKey": "t2_majors_conservative",
      "date": "2026-01-19",
      "value": "84.874888467492367333077280791472"
    },
    {
      "portfolioKey": "t1_majors_conservative",
      "date": "2026-01-19",
      "value": "100.843238180750824466089670065114"
    },
    {
      "portfolioKey": "t2_majors_conservative",
      "date": "2026-01-18",
      "value": "96.513240746695481319301080018032"
    },
    {
      "portfolioKey": "t1_majors_conservative",
      "date": "2026-01-18",
      "value": "99.717976836435705759791654614858"
    },
    {
      "portfolioKey": "t1_majors_conservative",
      "date": "2026-01-17",
      "value": "99.397722783962882945936168648883"
    }
  ],
  "snapshotSummary": [
    {
      "key": "t1_majors_conservative",
      "needsRecompute": false,
      "recomputeFromDate": null,
      "lastComputedAt": "2026-01-19T10:49:02.901Z",
      "asOfDate": "2026-01-19",
      "updatedAt": "2026-01-19T10:49:02.902Z"
    },
    {
      "key": "t2_majors_conservative",
      "needsRecompute": false,
      "recomputeFromDate": null,
      "lastComputedAt": "2026-01-19T10:49:04.414Z",
      "asOfDate": "2026-01-19",
      "updatedAt": "2026-01-19T10:49:04.415Z"
    }
  ]
}
```

Result:
- `primaryTickerPriceSummary` was empty before the run, confirming there were no ticker-keyed price rows.
- After the run, ticker-keyed prices exist for `SUIUSD` and `XAUTUSD`, with sample rows recorded.
- `MODEL_NAV` rows now extend through 2026-01-19 for both portfolios.

## 4) Job Evidence

Cron endpoint:
- `app/api/cron/portfolio-roi/route.ts` enforces `VERCEL_CRON_SECRET` unless `x-vercel-cron: 1` is present (added for Vercel cron).

Scheduling:
- No cron schedule existed previously in `vercel.json`. A 15-minute schedule has now been added in `vercel.json`.

Provider/logging:
- Price ingestion via `src/lib/prices/provider.ts` logs ticker requests and missing provider mappings.
- NAV compute in `src/lib/jobs/portfolio-roi.ts` logs primary ticker context, missing prices, and recompute errors.
- Logs are console-only; there is no local log file in the repo.

Invocation:
- Publish now triggers `/api/cron/portfolio-roi` asynchronously (non-blocking).
- Admin backfill endpoint exists at `POST /api/admin/roi/backfill` for on-demand runs.

Manual run logs (2026-01-19, `npx tsx scripts/run-portfolio-roi.ts`):
```
[INFO] Portfolio ROI recompute context { ... primaryTicker: "SUIUSD", startDate: "2026-01-14", endDate: "2026-01-19" }
[INFO] Price provider request { provider: "coingecko", ticker: "SUIUSD", providerId: "sui", ... }
[INFO] Price ingest summary { ticker: "SUIUSD", requested: 8, inserted: 3, updated: 5, ... }
[INFO] NAV series computed { portfolioKey: "t2_majors_conservative", primaryTicker: "SUIUSD", computedDays: 6 }
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

1) **Primary-only mode had no ticker-keyed price rows**
   - Before the change, `assetPriceDaily` only stored asset symbols (BTC/ETH/SOL...), and `primaryTickerPriceSummary` was empty (see before audit).
   - Primary-only ROI requires ticker rows like `SUIUSD`/`BTCUSD`, so NAV could not be computed without a new ingestion path.

2) **Symbol selection was allocation-wide instead of primary-only**
   - The ROI job previously derived symbols from allocation snapshots (multi-asset) and never mapped to tickers.
   - This mismatched the new requirement to fetch a single primary ticker per portfolioKey.

# Fixes Implemented

1) **Primary-only ROI mode**
   - Primary asset is resolved from the latest daily signal (fallback: allocation snapshot).
   - Primary asset is mapped to a ticker via `PRIMARY_TICKER_MAP`, and only that ticker is fetched.
   - Prices are stored by ticker in `assetPriceDaily.symbol`, and NAV is computed as buy-and-hold.
   - Paths:
     - `src/lib/jobs/portfolio-roi.ts`
     - `src/lib/prices/provider.ts`
     - `src/lib/prices/tickers.ts`

2) **Status-aware /api/roi**
   - Added `status`, `needsRecompute`, `asOfDate`, `lastComputedAt`, `lastSignalDate`, and `lastPriceDate`.
   - Added `primarySymbol`, `primaryTicker`, and `lastError` to support UI + diagnostics.
   - Implements `ok | updating | stale | error` with clear rules.
   - Path: `app/api/roi/route.ts`.

3) **UI handling of updating/stale**
   - Portfolio ROI panel shows last known series + "Updating" badge for `updating` or `stale`.
   - Only shows error message for `status='error'`.
   - Shows a subtle `Primary: {ticker}` label.
   - Path: `src/components/roi-dashboard/PortfolioRoiPanel.tsx`.

4) **Publish-time recompute kick**
   - Added non-blocking trigger to `/api/cron/portfolio-roi` after publish/edit.
   - Paths:
     - `app/api/admin/portfolio-daily-signals/route.ts`
     - `app/api/admin/portfolio-daily-signals/[id]/route.ts`

5) **Cron schedule + authorization**
   - Added Vercel cron schedule every 15 minutes.
   - Cron endpoint accepts `x-vercel-cron: 1` or `secret`.
   - Paths:
     - `vercel.json`
     - `app/api/cron/portfolio-roi/route.ts`

6) **Job hardening**
- Added DB-based lock to avoid overlapping runs.
- Stale lock detection after 30 minutes (lock stealing with holder/run metadata).
- Forward-fill NAV when prices are missing (keep last known NAV).
- Per-portfolio error isolation (no single failure breaks all portfolios).
- Path: `src/lib/jobs/portfolio-roi.ts`.

7) **Diagnostics endpoint**
   - Admin-only `/api/admin/roi/diagnostics?portfolioKey=...`.
   - Returns latest signal, allocation, NAV, primary ticker, price date, snapshot flags, and last error.
- Path: `app/api/admin/roi/diagnostics/route.ts`.

8) **Instrumentation + backfill**
- Structured logs for cron gating, lock acquisition, price ingestion, and NAV writes.
- Admin-only backfill endpoint for on-demand recompute.
- Paths:
  - `app/api/cron/portfolio-roi/route.ts`
  - `src/lib/jobs/portfolio-roi.ts`
  - `src/lib/prices/provider.ts`
  - `app/api/admin/roi/backfill/route.ts`

# Definition of Done (Evidence)

After run evidence:
- `node scripts/roi-audit.js` shows ticker-keyed price rows (`SUIUSD`, `XAUTUSD`) and `MODEL_NAV` rows for both portfolios, with `needsRecompute=false` and `asOfDate` set.
- `npx tsx scripts/roi-smoke.ts` shows `/api/roi` returning `status: ok`, populated `navSeries`, and `primaryTicker` for the default portfolio.
- Job logs confirm primary-only ingestion and NAV writes for the recomputed portfolios.
