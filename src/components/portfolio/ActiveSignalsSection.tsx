import Link from 'next/link'
import { ArrowRight, Activity, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatDate, timeago } from '@/lib/dates'
import {
  formatPct,
  formatPctCompact,
  formatNumber,
  formatUSD,
  pnlColor,
} from '@/lib/systems-format'
import { getAssetDisplayLabel } from '@/lib/portfolio-assets'
import { getActiveSystems, type SystemDefinition } from '@/lib/system-registry'
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot'
import type {
  DashboardSnapshot,
  DhrsSystem,
  MrsSystem,
  SdcaSystem,
} from '@/types/dashboard-snapshot'

type SignalRow = {
  text: string | null
  commentary: string | null
  publishedAt: Date
} | null

type SystemView = {
  system: SystemDefinition
  snapshot: DhrsSystem | MrsSystem | SdcaSystem | null
  signal: SignalRow
}

async function getSystemsForUser(userId: string): Promise<{
  hasAssignments: boolean
  systems: SystemView[]
  snapshotTimestamp: string | null
}> {
  const assignments = await prisma.userSystemAssignment.findMany({
    where: { userId, isActive: true },
    select: { systemSlug: true },
  })

  if (assignments.length === 0) {
    return { hasAssignments: false, systems: [], snapshotTimestamp: null }
  }

  const assignedSlugs = new Set(assignments.map((a) => a.systemSlug))
  const assignedSystems = getActiveSystems().filter((s) =>
    assignedSlugs.has(s.slug)
  )

  // Fetch the dashboard snapshot in parallel with the latest ingest signal
  // per system. Snapshot failure shouldn't block the page entirely.
  const [snapshotResult, latestPerSystem] = await Promise.all([
    getDashboardSnapshot()
      .then((s) => s as DashboardSnapshot)
      .catch(() => null),
    Promise.all(
      assignedSystems.map((system) =>
        prisma.portfolioDailySignal.findFirst({
          where: { category: system.slug },
          orderBy: { publishedAt: 'desc' },
          select: {
            signal: true,
            executiveSummary: true,
            publishedAt: true,
          },
        })
      )
    ),
  ])

  const systems: SystemView[] = assignedSystems.map((system, idx) => {
    let snap: DhrsSystem | MrsSystem | SdcaSystem | null = null
    if (snapshotResult) {
      if (system.slug === 'dhrs') snap = snapshotResult.dhrs ?? null
      else if (system.slug === 'mrs') snap = snapshotResult.mrs ?? null
      else if (system.slug === 'sdca') snap = snapshotResult.sdca ?? null
    }
    const row = latestPerSystem[idx]
    const signal: SignalRow = row
      ? {
          text: row.signal,
          commentary: row.executiveSummary,
          publishedAt: row.publishedAt,
        }
      : null
    return { system, snapshot: snap, signal }
  })

  return {
    hasAssignments: true,
    systems,
    snapshotTimestamp: snapshotResult?.timestamp ?? null,
  }
}

export async function ActiveSignalsSection({ userId }: { userId: string }) {
  const { hasAssignments, systems, snapshotTimestamp } =
    await getSystemsForUser(userId)

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-strong)]">
            Your Systems
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Live signals from every system you&rsquo;re assigned to.
          </p>
        </div>
        {snapshotTimestamp && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="h-3.5 w-3.5" />
            Updated {timeago(snapshotTimestamp)}
          </div>
        )}
      </div>

      {!hasAssignments ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              You don&rsquo;t have any systems assigned yet. Contact support
              for access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map(({ system, snapshot, signal }) =>
            system.signalFormat === 'rotation' ? (
              <RotationSystemCard
                key={system.slug}
                system={system}
                data={snapshot as DhrsSystem | MrsSystem | null}
                signal={signal}
              />
            ) : (
              <SdcaSystemCard
                key={system.slug}
                system={system}
                data={snapshot as SdcaSystem | null}
                signal={signal}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}

// ─── Card components ────────────────────────────────────────────────────────

function CardShell({
  system,
  children,
}: {
  system: SystemDefinition
  children: React.ReactNode
}) {
  return (
    <Card
      className="flex h-full flex-col border-l-4"
      style={{ borderLeftColor: system.color }}
    >
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: system.color }}
            >
              {system.shortName}
            </div>
            <div className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
              {system.name}
            </div>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function ViewFullDetailsLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/systems#${slug}`}
      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold-400)] hover:underline"
    >
      View full details
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}

function CommentaryBlock({ commentary }: { commentary: string | null }) {
  if (!commentary) return null
  return (
    <p className="mt-3 line-clamp-3 text-sm text-[var(--text-muted)]">
      {commentary}
    </p>
  )
}

function AwaitingState({ system }: { system: SystemDefinition }) {
  return (
    <CardShell system={system}>
      <div className="flex flex-1 items-center">
        <p className="text-sm italic text-[var(--text-muted)]">
          Awaiting first signal
        </p>
      </div>
      <ViewFullDetailsLink slug={system.slug} />
    </CardShell>
  )
}

function RotationSystemCard({
  system,
  data,
  signal,
}: {
  system: SystemDefinition
  data: DhrsSystem | MrsSystem | null
  signal: SignalRow
}) {
  if (!data && !signal) {
    return <AwaitingState system={system} />
  }

  const dominantLabel = data ? getAssetDisplayLabel(data.dominant) : null
  const regime = data?.regime ?? null
  const stats = data?.stats ?? null

  const regimeStyle =
    regime === true
      ? { bg: 'rgba(34, 197, 94, 0.15)', fg: 'var(--success)' }
      : regime === false
        ? { bg: 'rgba(239, 68, 68, 0.15)', fg: 'var(--danger)' }
        : { bg: 'var(--bg-skeleton)', fg: 'var(--text-muted)' }

  const lastRotation = data?.recent_rotations?.[data.recent_rotations.length - 1]

  return (
    <CardShell system={system}>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Currently Holding
        </div>
        <div className="mt-1 text-2xl font-bold text-[var(--text-strong)]">
          {dominantLabel || (signal?.text ?? '—')}
        </div>
        {regime !== null && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: regimeStyle.bg, color: regimeStyle.fg }}
          >
            <Activity className="h-3 w-3" />
            {regime ? 'Regime Active' : 'Regime Off'}
          </div>
        )}
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Stat
            label="Net Profit"
            value={formatPctCompact(stats.net_profit_pct, 1)}
            tooltip={formatPct(stats.net_profit_pct, 1)}
            color={pnlColor(stats.net_profit_pct)}
          />
          <Stat
            label="CAGR"
            value={formatPctCompact(stats.cagr, 1)}
            tooltip={formatPct(stats.cagr, 2)}
            color={pnlColor(stats.cagr)}
          />
          <Stat
            label="Max DD"
            value={`-${stats.max_dd_pct.toFixed(1)}%`}
            color="var(--danger)"
          />
        </div>
      )}

      {lastRotation && (
        <div
          className="mt-3 rounded-md border p-2 text-xs"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Last Rotation
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[var(--text-strong)]">
            <span>{getAssetDisplayLabel(lastRotation.from)}</span>
            <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
            <span>{getAssetDisplayLabel(lastRotation.to)}</span>
            <span className="ml-auto text-[var(--text-muted)] tabular-nums">
              {lastRotation.date}
            </span>
          </div>
        </div>
      )}

      <CommentaryBlock commentary={signal?.commentary ?? null} />

      {signal?.publishedAt && (
        <div className="mt-2 text-[11px] text-[var(--text-muted)]">
          Last signal {formatDate(signal.publishedAt, 'MMM d, yyyy')}
        </div>
      )}

      <ViewFullDetailsLink slug={system.slug} />
    </CardShell>
  )
}

function SdcaSystemCard({
  system,
  data,
  signal,
}: {
  system: SystemDefinition
  data: SdcaSystem | null
  signal: SignalRow
}) {
  if (!data && !signal) {
    return <AwaitingState system={system} />
  }

  const action = data?.action ?? null
  const zone = data?.zone ?? null
  const actionStyle = (() => {
    switch ((action ?? '').toUpperCase()) {
      case 'BUY':
        return {
          bg: 'rgba(34, 197, 94, 0.15)',
          fg: 'var(--success)',
        }
      case 'SELL':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          fg: 'var(--danger)',
        }
      default:
        return {
          bg: 'rgba(201, 162, 39, 0.15)',
          fg: 'var(--gold-solid)',
        }
    }
  })()

  return (
    <CardShell system={system}>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Zone
        </div>
        <div className="mt-1 text-2xl font-bold text-[var(--text-strong)]">
          {zone ?? signal?.text ?? '—'}
        </div>
        {action && (
          <div
            className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: actionStyle.bg, color: actionStyle.fg }}
          >
            {action}
          </div>
        )}
      </div>

      {data && (
        <div
          className="mt-4 grid grid-cols-2 gap-2 border-t pt-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Stat
            label="Composite Z"
            value={formatNumber(data.composite_z, 2)}
            color="var(--text-strong)"
          />
          <Stat
            label="BTC Price"
            value={formatUSD(data.btc_price)}
            color="var(--text-strong)"
          />
        </div>
      )}

      <CommentaryBlock commentary={signal?.commentary ?? null} />

      {signal?.publishedAt && (
        <div className="mt-2 text-[11px] text-[var(--text-muted)]">
          Last signal {formatDate(signal.publishedAt, 'MMM d, yyyy')}
        </div>
      )}

      <ViewFullDetailsLink slug={system.slug} />
    </CardShell>
  )
}

function Stat({
  label,
  value,
  tooltip,
  color,
}: {
  label: string
  value: string
  tooltip?: string
  color: string
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className="mt-0.5 truncate text-sm font-semibold tabular-nums"
        style={{ color }}
        title={tooltip}
      >
        {value}
      </div>
    </div>
  )
}
