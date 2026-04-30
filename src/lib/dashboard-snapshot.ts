import "server-only";
import type { DashboardSnapshot } from "@/types/dashboard-snapshot";

const SNAPSHOT_URL =
  process.env.DASHBOARD_SNAPSHOT_URL ??
  "https://zrloe2yypdn90aeb.public.blob.vercel-storage.com/dashboard/snapshot.json";

const EXPECTED_SCHEMA_VERSION = "1.0";

export class DashboardSnapshotError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DashboardSnapshotError";
  }
}

export type GetDashboardSnapshotOptions = {
  /**
   * Bypass the Next.js fetch cache and read the freshest copy from Blob.
   * Use this from the signal-bridge cron — page renders should keep the
   * default 5-minute cache for performance.
   */
  fresh?: boolean;
};

/**
 * Fetches the latest dashboard snapshot from Vercel Blob.
 * Default: 5-minute cache (matches Coen's SDCA patch cadence).
 * Pass `{ fresh: true }` to bypass the cache for time-critical reads.
 * Server-only — never import from a client component.
 */
export async function getDashboardSnapshot(
  options: GetDashboardSnapshotOptions = {}
): Promise<DashboardSnapshot> {
  let res: Response;
  try {
    res = await fetch(
      SNAPSHOT_URL,
      options.fresh
        ? { cache: "no-store" }
        : { next: { revalidate: 300, tags: ["dashboard-snapshot"] } }
    );
  } catch (err) {
    throw new DashboardSnapshotError("Network error fetching snapshot", err);
  }

  if (!res.ok) {
    throw new DashboardSnapshotError(
      `Snapshot fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  let data: DashboardSnapshot;
  try {
    data = (await res.json()) as DashboardSnapshot;
  } catch (err) {
    throw new DashboardSnapshotError("Snapshot JSON parse failed", err);
  }

  if (data.schema_version !== EXPECTED_SCHEMA_VERSION) {
    console.warn(
      `[dashboard-snapshot] Schema version drift: expected ${EXPECTED_SCHEMA_VERSION}, got ${data.schema_version}`,
    );
  }

  return data;
}
