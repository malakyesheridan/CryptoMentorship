import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/dates'
import { getActiveSystems, type SystemDefinition } from '@/lib/system-registry'

type ActiveSignal = {
  system: SystemDefinition
  signal: {
    text: string
    commentary: string | null
    publishedAt: Date
  } | null
}

async function getActiveSignalsForUser(userId: string): Promise<{
  signals: ActiveSignal[]
  hasAssignments: boolean
}> {
  const assignments = await prisma.userSystemAssignment.findMany({
    where: { userId, isActive: true },
    select: { systemSlug: true },
  })

  if (assignments.length === 0) {
    return { signals: [], hasAssignments: false }
  }

  const registry = getActiveSystems()
  const assignedSlugs = new Set(assignments.map((a) => a.systemSlug))
  const assignedSystems = registry.filter((s) => assignedSlugs.has(s.slug))

  // Pull the latest signal per assigned system. PortfolioDailySignal stores
  // ingest signals with category = system slug.
  const latestPerSystem = await Promise.all(
    assignedSystems.map((system) =>
      prisma.portfolioDailySignal
        .findFirst({
          where: { category: system.slug },
          orderBy: { publishedAt: 'desc' },
          select: {
            signal: true,
            executiveSummary: true,
            publishedAt: true,
          },
        })
        .then((row) => ({
          system,
          signal: row
            ? {
                text: row.signal,
                commentary: row.executiveSummary,
                publishedAt: row.publishedAt,
              }
            : null,
        }))
    )
  )

  return { signals: latestPerSystem, hasAssignments: true }
}

export async function ActiveSignalsSection({ userId }: { userId: string }) {
  const { signals, hasAssignments } = await getActiveSignalsForUser(userId)

  if (!hasAssignments) {
    return (
      <Card className="card">
        <CardHeader>
          <CardTitle>Your Active Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-muted)]">
            No systems assigned. Contact your account manager.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Your Active Signals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {signals.map(({ system, signal }) => (
            <Link
              key={system.slug}
              href={`/systems#${system.slug}`}
              className="group block rounded-lg border p-4 transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                borderColor: 'var(--border-subtle)',
                borderLeftWidth: 4,
                borderLeftColor: system.color,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {system.shortName}
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {signal ? (
                <>
                  <div className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                    {signal.text}
                  </div>
                  {signal.commentary && (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--text-muted)]">
                      {signal.commentary}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-[var(--text-muted)]">
                    Updated {formatDate(signal.publishedAt, 'MMM d, yyyy')}
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm italic text-[var(--text-muted)]">
                  Awaiting first signal
                </div>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
