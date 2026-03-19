import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { TrendingUp, Plus, BarChart3, Activity, Settings } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

const getSignalsData = unstable_cache(
  async () => {
    const [signals, totalCount, todayCount, byTier] = await Promise.all([
      prisma.portfolioDailySignal.findMany({
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          tier: true,
          category: true,
          riskProfile: true,
          signal: true,
          executiveSummary: true,
          publishedAt: true,
          createdAt: true,
          createdBy: {
            select: { name: true },
          },
        },
        take: 50,
      }),
      prisma.portfolioDailySignal.count(),
      prisma.portfolioDailySignal.count({
        where: {
          publishedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.portfolioDailySignal.groupBy({
        by: ['tier'],
        _count: { tier: true },
      }),
    ])
    return { signals, totalCount, todayCount, byTier }
  },
  ['admin-signals'],
  { revalidate: 60, tags: ['admin-signals'] }
)

export default async function AdminSignalsPage() {
  const { signals, totalCount, todayCount, byTier } = await getSignalsData()

  const tierBreakdown = {
    T1: byTier.find((t: { tier: string; _count: { tier: number } }) => t.tier === 'T1')?._count.tier || 0,
    T2: byTier.find((t: { tier: string; _count: { tier: number } }) => t.tier === 'T2')?._count.tier || 0,
    T3: byTier.find((t: { tier: string; _count: { tier: number } }) => t.tier === 'T3')?._count.tier || 0,
  }

  return (
    <div className="container-main section-padding">
      <SectionHeader
        title="Daily Signals"
        subtitle="Manage portfolio daily signals across all tiers"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">Total Signals</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{totalCount}</p>
                <p className="text-xs text-[var(--text-muted)]">All-time</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">Today&apos;s Signals</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{todayCount}</p>
                <p className="text-xs text-[var(--text-muted)]">Published today</p>
              </div>
              <Activity className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-strong)]">By Tier</p>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{totalCount}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  T1: {tierBreakdown.T1}, T2: {tierBreakdown.T2}, T3: {tierBreakdown.T3}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" asChild>
          <Link href="/admin/signals/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
        <Button asChild>
          <Link href="/admin/signals/new">
            <Plus className="h-4 w-4 mr-2" />
            New Signal
          </Link>
        </Button>
      </div>

      {/* Signals Table */}
      {signals.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Signal</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Tier</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Risk Profile</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Category</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">Published</th>
                  <th className="text-left text-sm font-medium text-[var(--text-muted)] px-6 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr key={signal.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm text-[var(--text-strong)]">{signal.signal}</p>
                        {signal.executiveSummary && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1 max-w-md">{signal.executiveSummary}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">{signal.tier}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {signal.riskProfile.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-muted)] capitalize">{signal.category || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-muted)]">{formatDate(signal.publishedAt, 'dd-MM-yyyy')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-muted)]">{signal.createdBy?.name || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<TrendingUp />}
          title="No signals yet"
          description="Create your first portfolio daily signal."
          action={{
            label: 'New Signal',
            href: '/admin/signals/new',
          }}
        />
      )}
    </div>
  )
}
