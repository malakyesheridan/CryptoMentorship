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
  if (sys.slug === 'dhrs') {
    return snapshot.dhrs ? mapRotation('dhrs', snapshot.dhrs) : null
  }
  if (sys.slug === 'mrs') {
    return snapshot.mrs ? mapRotation('mrs', snapshot.mrs) : null
  }
  if (sys.slug === 'mars') {
    return snapshot.mars ? mapRotation('mars', snapshot.mars) : null
  }
  if (sys.slug === 'tars') {
    return snapshot.tars ? mapRotation('tars', snapshot.tars) : null
  }
  if (sys.slug === 'sdca') {
    return snapshot.sdca ? mapSdca(snapshot.sdca) : null
  }
  return null
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
  if (sys.slug === 'dhrs') {
    const data = snapshot.dhrs
    if (!data) return { changed: false, reason: 'no snapshot data' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = rotationKeyFromIngest(last)
    const currentKey = rotationKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapRotation('dhrs', data),
    }
  }

  if (sys.slug === 'mrs') {
    const data = snapshot.mrs
    if (!data) return { changed: false, reason: 'no snapshot data (mrs not in snapshot yet)' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = rotationKeyFromIngest(last)
    const currentKey = rotationKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapRotation('mrs', data),
    }
  }

  if (sys.slug === 'mars') {
    const data = snapshot.mars
    if (!data) return { changed: false, reason: 'no snapshot data (mars not in snapshot yet)' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = rotationKeyFromIngest(last)
    const currentKey = rotationKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapRotation('mars', data),
    }
  }

  if (sys.slug === 'tars') {
    const data = snapshot.tars
    if (!data) return { changed: false, reason: 'no snapshot data (tars not in snapshot yet)' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = rotationKeyFromIngest(last)
    const currentKey = rotationKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapRotation('tars', data),
    }
  }

  if (sys.slug === 'sdca') {
    const data = snapshot.sdca
    if (!data) return { changed: false, reason: 'no snapshot data' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = sdcaKeyFromIngest(last)
    const currentKey = sdcaKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapSdca(data),
    }
  }

  return {
    changed: false,
    reason: `unknown system mapping (registry has slug ${sys.slug} but no mapper)`,
  }
}
