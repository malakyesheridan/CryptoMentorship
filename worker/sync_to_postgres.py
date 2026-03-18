"""
Stewart & Co — Strategy Sync Worker
Runs as a Render Cron Job (0 6 * * * UTC daily).

Pipeline:
  1. Import MARS engine + SDCA pipeline from sdca/ directory
  2. Run full data refresh (API fetches)
  3. Compute SDCA composite Z-score
  4. Run MARS rotation simulation
  5. Run combined (MARS + SDCA) simulation
  6. Upsert results into PostgreSQL (Prisma-managed schema)
  7. Call Vercel webhook to revalidate /strategies pages

Env vars required:
  DATABASE_URL  — PostgreSQL connection string (same DB as Next.js app)
  CRON_SECRET   — Shared secret for Vercel webhook auth
  VERCEL_URL    — e.g. stewartandco.vercel.app (optional, defaults to this)
  CI_API_KEY    — ChartInspect API key (for SDCA data pipeline)
  FRED_API_KEY  — FRED API key (for macro data)
"""

import os
import sys
import json
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("sync_worker")

# ---------------------------------------------------------------------------
# Resolve SDCA package path
# ---------------------------------------------------------------------------
# On Render the sdca/ directory sits alongside the worker/ directory.
# Locally it may be at a different path — set SDCA_ROOT env var to override.
SDCA_ROOT = os.environ.get(
    "SDCA_ROOT",
    str(Path(__file__).resolve().parent.parent / "sdca"),
)
if SDCA_ROOT not in sys.path:
    sys.path.insert(0, str(Path(SDCA_ROOT).parent))  # parent so `from sdca.X` works
    sys.path.insert(0, SDCA_ROOT)  # also add sdca/ itself for `from mars_engine import ...`

log.info("SDCA_ROOT = %s", SDCA_ROOT)

# ---------------------------------------------------------------------------
# Constants — must match Prisma schema naming exactly
# ---------------------------------------------------------------------------
# Prisma generates PascalCase table names and camelCase columns by default.
# PostgreSQL lowercases unquoted identifiers, but Prisma quotes everything,
# so the actual DB tables use the exact casing from schema.prisma.
TBL_STRATEGY          = '"Strategy"'
TBL_STRATEGY_SNAPSHOT = '"StrategySnapshot"'
TBL_EQUITY_CURVE      = '"EquityCurvePoint"'
TBL_STRATEGY_UPDATE   = '"StrategyUpdate"'

STRATEGIES = {
    "mars":     {"name": "MARS Rotation",     "type": "rotation"},
    "sdca":     {"name": "SDCA Buy System",   "type": "buy_system"},
    "combined": {"name": "Combined Portfolio", "type": "combined"},
}

# SDCA pipeline config (from sdca_dashboard.py)
INCLUDED_INDICATORS = [
    "mvrv_z", "puell", "lth_cost_dist", "lth_sopr", "vdd_multiple",
    "hash_ribbon", "mayer", "vol_30", "m2_yoy", "us10y",
]
WEIGHTS = {
    "mvrv_z": 2.0, "puell": 2.2, "lth_cost_dist": 1.5, "lth_sopr": 0.9,
    "vdd_multiple": 1.3, "hash_ribbon": 0.6, "mayer": 1.4, "vol_30": 0.7,
    "m2_yoy": 1.6, "us10y": 1.4,
}


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def get_connection():
    """Return a psycopg2 connection from DATABASE_URL."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL env var is not set")
    return psycopg2.connect(url)


def generate_cuid():
    """Generate a cuid-like ID (matches Prisma's @default(cuid()))."""
    import random
    import string
    import time
    chars = string.ascii_lowercase + string.digits
    ts = hex(int(time.time() * 1000))[2:]
    rand = "".join(random.choices(chars, k=12))
    return f"c{ts}{rand}"


def lookup_strategy_ids(cur) -> dict:
    """Return {slug: id} for all strategies."""
    cur.execute(f'SELECT "id", "slug" FROM {TBL_STRATEGY}')
    return {row[1]: row[0] for row in cur.fetchall()}


# ---------------------------------------------------------------------------
# MARS sync
# ---------------------------------------------------------------------------
def sync_mars(cur, strategy_id: str, mars_results: dict):
    """Upsert MARS rotation data into PostgreSQL."""
    daily = mars_results["daily"]
    stats = mars_results["stats"]
    rotations = mars_results["rotations"]
    today = date.today()

    # --- Latest snapshot ---
    last_row = daily.iloc[-1]
    holdings = [{"asset": last_row["dominant"], "allocationPct": 100.0, "price": None}]
    perf = {
        "netReturn": stats["net_profit_pct"],
        "sharpe": stats["sharpe"],
        "sortino": stats["sortino"],
        "maxDd": stats["max_dd_pct"],
        "calmar": stats["calmar"],
        "omega": stats["omega"],
        "winRate": stats["win_rate_pct"],
    }

    upsert_snapshot(cur, strategy_id, today, holdings, perf,
                    float(last_row["equity"]), last_row["dominant"])

    # --- Equity curve (full history) ---
    upsert_equity_curve(cur, strategy_id, daily)

    # --- Rotation events as StrategyUpdate ---
    upsert_rotation_updates(cur, strategy_id, rotations)

    log.info("MARS sync complete: %d equity points, %d rotations",
             len(daily), len(rotations))


# ---------------------------------------------------------------------------
# SDCA sync
# ---------------------------------------------------------------------------
def sync_sdca(cur, strategy_id: str, sdca_df: pd.DataFrame):
    """Upsert SDCA buy system data."""
    today = date.today()

    if sdca_df is None or sdca_df.empty:
        log.warning("SDCA DataFrame is empty, skipping sync")
        return

    last_row = sdca_df.iloc[-1]
    z_val = float(last_row.get("composite_z_smooth", last_row.get("composite_z", 0)))
    zone = str(last_row.get("zone", "neutral"))

    holdings = [{"asset": "BTC", "allocationPct": 100.0, "price": float(last_row.get("close", 0))}]
    perf = {
        "netReturn": 0,
        "sharpe": 0,
        "sortino": 0,
        "maxDd": 0,
        "calmar": 0,
        "omega": 0,
        "winRate": 0,
        "compositeZ": z_val,
        "zone": zone,
    }

    upsert_snapshot(cur, strategy_id, today, holdings, perf, 1.0, zone)
    log.info("SDCA sync complete: zone=%s, z=%.3f", zone, z_val)


# ---------------------------------------------------------------------------
# Combined sync
# ---------------------------------------------------------------------------
def sync_combined(cur, strategy_id: str, combined_results: dict):
    """Upsert combined (MARS + SDCA) simulation data."""
    portfolio = combined_results["portfolio"]
    stats = combined_results["stats"]
    trades = combined_results["trades"]
    today = date.today()

    last_row = portfolio.iloc[-1]

    # Holdings: split between MARS position and SDCA BTC
    holdings = []
    mars_dominant = last_row.get("mars_dominant", "USD")
    mars_basis = float(last_row.get("mars_basis", 0))
    btc_value = float(last_row.get("btc_value", 0))
    total = float(last_row.get("total_portfolio", mars_basis + btc_value))

    if total > 0:
        if mars_basis > 0:
            holdings.append({
                "asset": mars_dominant,
                "allocationPct": round(mars_basis / total * 100, 2),
                "price": None,
            })
        if btc_value > 0:
            holdings.append({
                "asset": "BTC (SDCA)",
                "allocationPct": round(btc_value / total * 100, 2),
                "price": float(last_row.get("btc_price", 0)),
            })

    perf = {
        "netReturn": stats.get("total_return_pct", 0),
        "sharpe": stats.get("sharpe", 0),
        "sortino": 0,
        "maxDd": stats.get("max_dd_pct", 0),
        "calmar": 0,
        "omega": 0,
        "winRate": 0,
        "sdcaBuys": stats.get("sdca_buys", 0),
        "sdcaDeployed": stats.get("sdca_deployed", 0),
    }

    upsert_snapshot(cur, strategy_id, today, holdings, perf,
                    float(total), mars_dominant)

    # Equity curve from combined portfolio
    upsert_combined_equity_curve(cur, strategy_id, portfolio)

    # SDCA buy events as StrategyUpdate
    if trades is not None and not trades.empty:
        upsert_sdca_buy_updates(cur, strategy_id, trades)

    log.info("Combined sync complete: final=$%.0f, %d SDCA buys",
             total, stats.get("sdca_buys", 0))


# ---------------------------------------------------------------------------
# Upsert helpers
# ---------------------------------------------------------------------------
def upsert_snapshot(cur, strategy_id, snap_date, holdings, perf,
                    equity_value, dominant_asset):
    """Upsert a single StrategySnapshot row."""
    cur.execute(f"""
        INSERT INTO {TBL_STRATEGY_SNAPSHOT}
            ("id", "strategyId", "date", "holdingsJson", "performanceJson",
             "equityValue", "dominantAsset", "createdAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT ("strategyId", "date") DO UPDATE SET
            "holdingsJson"    = EXCLUDED."holdingsJson",
            "performanceJson" = EXCLUDED."performanceJson",
            "equityValue"     = EXCLUDED."equityValue",
            "dominantAsset"   = EXCLUDED."dominantAsset"
    """, (
        generate_cuid(), strategy_id, snap_date,
        json.dumps(holdings), json.dumps(perf),
        equity_value, str(dominant_asset),
    ))


def upsert_equity_curve(cur, strategy_id, daily_df):
    """Bulk upsert EquityCurvePoint rows from MARS daily DataFrame."""
    rows = []
    for _, row in daily_df.iterrows():
        d = row["date"]
        if isinstance(d, pd.Timestamp):
            d = d.date()
        rows.append((
            generate_cuid(),
            strategy_id,
            d,
            float(row["equity"]),
            str(row["dominant"]),
            float(row["daily_ret"]) if pd.notna(row.get("daily_ret")) else None,
        ))

    execute_values(cur, f"""
        INSERT INTO {TBL_EQUITY_CURVE}
            ("id", "strategyId", "date", "equityValue", "dominantAsset",
             "dailyReturn", "createdAt")
        VALUES %s
        ON CONFLICT ("strategyId", "date") DO UPDATE SET
            "equityValue"   = EXCLUDED."equityValue",
            "dominantAsset" = EXCLUDED."dominantAsset",
            "dailyReturn"   = EXCLUDED."dailyReturn"
    """, rows, template="(%s, %s, %s, %s, %s, %s, NOW())")


def upsert_combined_equity_curve(cur, strategy_id, portfolio_df):
    """Bulk upsert EquityCurvePoint from combined portfolio DataFrame."""
    rows = []
    prev_total = None
    for _, row in portfolio_df.iterrows():
        d = row["date"]
        if isinstance(d, pd.Timestamp):
            d = d.date()
        total = float(row.get("total_portfolio", 0))
        daily_ret = None
        if prev_total and prev_total > 0:
            daily_ret = (total - prev_total) / prev_total
        prev_total = total

        rows.append((
            generate_cuid(),
            strategy_id,
            d,
            total,
            str(row.get("mars_dominant", "USD")),
            daily_ret,
        ))

    execute_values(cur, f"""
        INSERT INTO {TBL_EQUITY_CURVE}
            ("id", "strategyId", "date", "equityValue", "dominantAsset",
             "dailyReturn", "createdAt")
        VALUES %s
        ON CONFLICT ("strategyId", "date") DO UPDATE SET
            "equityValue"   = EXCLUDED."equityValue",
            "dominantAsset" = EXCLUDED."dominantAsset",
            "dailyReturn"   = EXCLUDED."dailyReturn"
    """, rows, template="(%s, %s, %s, %s, %s, %s, NOW())")


def upsert_rotation_updates(cur, strategy_id, rotations_df):
    """Insert rotation events as StrategyUpdate rows (skip duplicates)."""
    for _, row in rotations_df.iterrows():
        d = row["date"]
        if isinstance(d, pd.Timestamp):
            d = d.date()

        from_asset = str(row["from"])
        to_asset = str(row["to"])

        # Check if this rotation already exists
        cur.execute(f"""
            SELECT 1 FROM {TBL_STRATEGY_UPDATE}
            WHERE "strategyId" = %s AND "date" = %s AND "updateType" = 'rotation'
              AND "fromState" = %s AND "toState" = %s
            LIMIT 1
        """, (strategy_id, d, json.dumps({"asset": from_asset}),
              json.dumps({"asset": to_asset})))

        if cur.fetchone() is None:
            cur.execute(f"""
                INSERT INTO {TBL_STRATEGY_UPDATE}
                    ("id", "strategyId", "date", "updateType", "fromState",
                     "toState", "notify", "createdAt")
                VALUES (%s, %s, %s, 'rotation', %s, %s, %s, NOW())
            """, (
                generate_cuid(), strategy_id, d,
                json.dumps({"asset": from_asset}),
                json.dumps({"asset": to_asset}),
                d == date.today(),  # notify only for today's rotations
            ))


def upsert_sdca_buy_updates(cur, strategy_id, trades_df):
    """Insert SDCA buy events as StrategyUpdate rows (skip duplicates)."""
    for _, row in trades_df.iterrows():
        d = row["date"]
        if isinstance(d, pd.Timestamp):
            d = d.date()

        cur.execute(f"""
            SELECT 1 FROM {TBL_STRATEGY_UPDATE}
            WHERE "strategyId" = %s AND "date" = %s AND "updateType" = 'sdca_buy'
            LIMIT 1
        """, (strategy_id, d))

        if cur.fetchone() is None:
            cur.execute(f"""
                INSERT INTO {TBL_STRATEGY_UPDATE}
                    ("id", "strategyId", "date", "updateType", "toState",
                     "metadataJson", "notify", "createdAt")
                VALUES (%s, %s, %s, 'sdca_buy', %s, %s, %s, NOW())
            """, (
                generate_cuid(), strategy_id, d,
                json.dumps({
                    "asset": "BTC",
                    "usdDeployed": float(row.get("usd_in", 0)),
                    "btcReceived": float(row.get("btc_got", 0)),
                    "btcPrice": float(row.get("btc_price", 0)),
                }),
                json.dumps({
                    "zScore": float(row.get("z", 0)),
                    "marsRegime": str(row.get("mars_regime", "")),
                }),
                d == date.today(),
            ))


# ---------------------------------------------------------------------------
# Vercel webhook
# ---------------------------------------------------------------------------
def trigger_revalidation():
    """Call Vercel webhook to revalidate /strategies pages."""
    secret = os.environ.get("CRON_SECRET", "")
    base_url = os.environ.get("VERCEL_URL", "stewartandco.vercel.app")

    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"

    url = f"{base_url}/api/strategies/sync"
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {secret}"},
            json={"source": "worker"},
            timeout=30,
        )
        log.info("Revalidation webhook: %s %s", resp.status_code, resp.text[:200])
    except Exception as e:
        log.error("Revalidation webhook failed: %s", e)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def run_pipeline():
    """Run the full sync pipeline."""
    log.info("=" * 60)
    log.info("Starting strategy sync pipeline")
    log.info("=" * 60)

    # Step 1: Import engines (deferred to avoid import errors at module level)
    log.info("Step 1: Importing SDCA pipeline...")
    try:
        from sdca_data import load_all_sdca_data
        from sdca_zscore import build_composite_zscore
        from mars_engine import MARSEngine, run_combined_simulation
    except ImportError as e:
        log.error("Failed to import SDCA modules: %s", e)
        log.error("Ensure SDCA_ROOT is set correctly: %s", SDCA_ROOT)
        sys.exit(1)

    # Step 2: Load fresh data
    log.info("Step 2: Loading SDCA data (API fetches)...")
    raw_data = load_all_sdca_data(force=True)
    log.info("  Loaded %d rows, %d columns", len(raw_data), len(raw_data.columns))

    # Step 3: Build composite Z-score
    log.info("Step 3: Building composite Z-score...")
    sdca_df = build_composite_zscore(raw_data, INCLUDED_INDICATORS, WEIGHTS)
    log.info("  Z-score range: %.3f to %.3f",
             sdca_df["composite_z_smooth"].min(),
             sdca_df["composite_z_smooth"].max())

    # Step 4: Run MARS engine
    log.info("Step 4: Running MARS engine...")
    engine = MARSEngine()
    mars_results = engine.run(force_refresh=True)
    log.info("  MARS equity: %.4f, rotations: %d",
             mars_results["stats"]["final_equity"],
             mars_results["stats"]["n_rotations"])

    # Step 5: Run combined simulation
    log.info("Step 5: Running combined simulation...")
    combined_results = run_combined_simulation(mars_results, sdca_df)
    log.info("  Combined final: $%.0f, SDCA buys: %d",
             combined_results["stats"]["final_value"],
             combined_results["stats"]["sdca_buys"])

    # Step 6: Write to PostgreSQL
    log.info("Step 6: Writing to PostgreSQL...")
    conn = get_connection()
    try:
        cur = conn.cursor()

        # Look up strategy IDs
        strategy_ids = lookup_strategy_ids(cur)
        log.info("  Found strategies: %s", strategy_ids)

        # Ensure all 3 strategies exist
        for slug, meta in STRATEGIES.items():
            if slug not in strategy_ids:
                new_id = generate_cuid()
                sort_order = {"mars": 1, "sdca": 2, "combined": 3}[slug]
                cur.execute(f"""
                    INSERT INTO {TBL_STRATEGY}
                        ("id", "name", "slug", "type", "isActive", "sortOrder",
                         "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, true, %s, NOW(), NOW())
                    ON CONFLICT ("slug") DO NOTHING
                """, (new_id, meta["name"], slug, meta["type"], sort_order))
                strategy_ids[slug] = new_id
                log.info("  Created strategy: %s (id=%s)", slug, new_id)

        conn.commit()

        # Sync each strategy
        if "mars" in strategy_ids:
            log.info("  Syncing MARS...")
            sync_mars(cur, strategy_ids["mars"], mars_results)

        if "sdca" in strategy_ids:
            log.info("  Syncing SDCA...")
            sync_sdca(cur, strategy_ids["sdca"], sdca_df)

        if "combined" in strategy_ids:
            log.info("  Syncing Combined...")
            sync_combined(cur, strategy_ids["combined"], combined_results)

        conn.commit()
        log.info("  PostgreSQL writes committed successfully")
    except Exception as e:
        conn.rollback()
        log.error("PostgreSQL write failed: %s", e)
        raise
    finally:
        conn.close()

    # Step 7: Trigger Vercel revalidation
    log.info("Step 7: Triggering Vercel revalidation...")
    trigger_revalidation()

    log.info("=" * 60)
    log.info("Pipeline complete!")
    log.info("=" * 60)


if __name__ == "__main__":
    run_pipeline()
