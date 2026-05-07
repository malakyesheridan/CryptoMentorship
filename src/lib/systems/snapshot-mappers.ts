import { prisma } from '@/lib/prisma'
import type {
  DashboardSnapshot,
  DhrsSystem,
  MrsSystem,
  SdcaSystem,
} from '@/types/dashboard-snapshot'
import { dayKey, type IngestPayload } from '@/lib/systems/ingest'
import type { SystemDefinition } from '@/lib/system-registry'

export type StoredSignal =
  | { signal_type?: string; data?: Record<string, unknown> }
  | null

export type ChangeDetection = {
  changed: boolean
  reason: string
  payload?: IngestPayload
}

export type SystemSnapshotBlock = DhrsSystem | MrsSystem | SdcaSystem

export function pickLatestRotation(
  rotations:
    | DhrsSystem['recent_rotations']
    | MrsSystem['recent_rotations']
    | undefined
) {
  if (!rotations || rotations.length === 0) return undefined
  let best = rotations[0]
  for (let i = 1; i < rotations.length; i++) {
    const cur = rotations[i]
    if ((cur?.date ?? '') > (best?.date ?? '')) best = cur
  }
  return best
}

export function rotationKey(snap: DhrsSystem | MrsSystem): string {
  const lr = pickLatestRotation(snap.recent_rotations)
  return [
    snap.dominant ?? '',
    lr?.date ?? '',
    lr?.from ?? '',
    lr?.to ?? '',
  ].join('|')
}

export function rotationKeyFromIngest(stored: StoredSignal): string | null {
  if (!stored || stored.signal_type !== 'rotation' || !stored.data) return null
  const d = stored.data as Record<string, unknown>
  return [
    typeof d.dominant_asset === 'string' ? d.dominant_asset : '',
    typeof d.rotation_date === 'string' ? d.rotation_date : '',
    typeof d.from_asset === 'string' ? d.from_asset : '',
    typeof d.to_asset === 'string' ? d.to_asset : '',
  ].join('|')
}

export function sdcaKey(snap: SdcaSystem): string {
  return `${snap.zone}|${snap.action}`
}

export function sdcaKeyFromIngest(stored: StoredSignal): string | null {
  if (!stored || stored.signal_type !== 'zone_action' || !stored.data) return null
  const d = stored.data as Record<string, unknown>
  return `${typeof d.zone === 'string' ? d.zone : ''}|${typeof d.action === 'string' ? d.action : ''}`
}

export function mapRotation(
  slug: 'dhrs' | 'mrs' | 'mars' | 'tars',
  snap: DhrsSystem | MrsSystem
): IngestPayload {
  const lr = pickLatestRotation(snap.recent_rotations)
  return {
    system: slug,
    signal_type: 'rotation',
    data: {
      regime: snap.regime,
      dominant_asset: snap.dominant,
      from_asset: lr?.from,
      to_asset: lr?.to,
      allocation: `100% ${snap.dominant}`,
      rotation_date: lr?.date ?? dayKey(new Date()),
      commentary: undefined,
    },
  }
}

export function mapSdca(snap: SdcaSystem): IngestPayload {
  return {
    system: 'sdca',
    signal_type: 'zone_action',
    data: {
      zone: snap.zone,
      action: snap.action,
      composite_z: snap.composite_z,
      btc_price: snap.btc_price,
      signal_date: dayKey(new Date()),
      commentary: undefined,
    },
  }
}

export async function lastIngestPayload(
  systemSlug: string
): Promise<StoredSignal> {
  const last = await prisma.systemSignalIngest.findFirst({
    where: { systemSlug },
    orderBy: { processedAt: 'desc' },
    select: { signalData: true },
  })
  return (last?.signalData as StoredSignal) ?? null
}

// ─── Dispatch table ─────────────────────────────────────────────────────────
//
// One source of truth for the per-system glue between a DashboardSnapshot
// and the ingest pipeline. Used by mapSnapshotToPayload (daily-digest cron),
// detectChange (legacy signal-bridge + admin diagnose), and the /portfolio
// snapshot block lookup.
//
// Adding a new system: register it in src/lib/system-registry.ts AND add an
// entry here keyed by the slug. An active-registry slug missing from this
// table is handled as "unknown mapping" — logged and skipped, never thrown.

export interface SystemDispatch {
  getBlock(snapshot: DashboardSnapshot): SystemSnapshotBlock | undefined
  noDataReason: string
  currentKey(block: SystemSnapshotBlock): string
  keyFromIngest(stored: StoredSignal): string | null
  mapPayload(block: SystemSnapshotBlock): IngestPayload
}

function rotationDispatch(
  slug: 'dhrs' | 'mrs' | 'mars' | 'tars',
  noDataReason: string,
  getBlock: (s: DashboardSnapshot) => DhrsSystem | MrsSystem | undefined
): SystemDispatch {
  return {
    getBlock,
    noDataReason,
    currentKey: (block) => rotationKey(block as DhrsSystem | MrsSystem),
    keyFromIngest: rotationKeyFromIngest,
    mapPayload: (block) => mapRotation(slug, block as DhrsSystem | MrsSystem),
  }
}

const sdcaDispatch: SystemDispatch = {
  getBlock: (s) => s.sdca,
  noDataReason: 'no snapshot data',
  currentKey: (block) => sdcaKey(block as SdcaSystem),
  keyFromIngest: sdcaKeyFromIngest,
  mapPayload: (block) => mapSdca(block as SdcaSystem),
}

export const SYSTEM_DISPATCH: Record<string, SystemDispatch> = {
  dhrs: rotationDispatch('dhrs', 'no snapshot data', (s) => s.dhrs),
  mrs:  rotationDispatch('mrs',  'no snapshot data (mrs not in snapshot yet)',  (s) => s.mrs),
  mars: rotationDispatch('mars', 'no snapshot data (mars not in snapshot yet)', (s) => s.mars),
  tars: rotationDispatch('tars', 'no snapshot data (tars not in snapshot yet)', (s) => s.tars),
  sdca: sdcaDispatch,
}

/**
 * Read the per-system block out of a snapshot. Returns undefined for
 * unregistered slugs or missing data.
 */
export function getSnapshotBlock(
  slug: string,
  snapshot: DashboardSnapshot
): SystemSnapshotBlock | undefined {
  return SYSTEM_DISPATCH[slug]?.getBlock(snapshot)
}

/**
 * Map a snapshot to an IngestPayload for the given system, regardless of
 * whether anything has changed. Used by the daily-digest cron, which always
 * upserts today's signal so the email reflects current state — diffing is
 * not needed because PortfolioDailySignal already enforces one row per
 * (system, UTC day) via processSignalIngest's deleteMany+create.
 */
export function mapSnapshotToPayload(
  sys: SystemDefinition,
  snapshot: DashboardSnapshot
): IngestPayload | null {
  const dispatch = SYSTEM_DISPATCH[sys.slug]
  if (!dispatch) return null
  const block = dispatch.getBlock(snapshot)
  return block ? dispatch.mapPayload(block) : null
}

/**
 * Compare current snapshot state against the most recent SystemSignalIngest
 * payload to decide if the signal has materially changed. Used by the
 * legacy signal-bridge route (still callable for diagnostics) and the
 * admin diagnose endpoint.
 */
export async function detectChange(
  sys: SystemDefinition,
  snapshot: DashboardSnapshot
): Promise<ChangeDetection> {
  const dispatch = SYSTEM_DISPATCH[sys.slug]
  if (!dispatch) {
    return {
      changed: false,
      reason: `unknown system mapping (registry has slug ${sys.slug} but no mapper)`,
    }
  }
  const block = dispatch.getBlock(snapshot)
  if (!block) {
    return { changed: false, reason: dispatch.noDataReason }
  }
  const last = await lastIngestPayload(sys.slug)
  const lastKey = dispatch.keyFromIngest(last)
  const currentKey = dispatch.currentKey(block)
  if (lastKey === currentKey) {
    return { changed: false, reason: `unchanged (${currentKey})` }
  }
  return {
    changed: true,
    reason: `${lastKey ?? 'first'} → ${currentKey}`,
    payload: dispatch.mapPayload(block),
  }
}
