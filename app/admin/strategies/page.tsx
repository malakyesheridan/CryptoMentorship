import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { getAllStrategies } from '@/lib/strategies/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import { TrendingUp } from 'lucide-react'

const getCachedStrategies = unstable_cache(
  async () => getAllStrategies(),
  ['admin-strategies'],
  { revalidate: 60, tags: ['admin-strategies'] }
)

export default async function AdminStrategiesPage() {
  const strategies = await getCachedStrategies()

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-hero text-3xl sm:text-4xl mb-2">
            <span>Strategy</span> <span className="gold">Management</span>
          </h1>
          <p className="subhead">Manage portfolio strategies, snapshots, and updates</p>
        </div>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Last Snapshot</th>
                  <th className="py-2 pr-4">Snapshots</th>
                  <th className="py-2 pr-4">Updates</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {strategies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                      No strategies found
                    </td>
                  </tr>
                )}
                {strategies.map((strategy: Awaited<ReturnType<typeof getAllStrategies>>[number]) => {
                  const latestSnapshot = strategy.snapshots[0] ?? null
                  return (
                    <tr key={strategy.id} className="text-[var(--text-strong)]">
                      <td className="py-3 pr-4 font-medium text-[var(--text-strong)]">
                        {strategy.name}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {strategy.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-muted)] font-mono text-xs">
                        {strategy.slug}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${
                            strategy.isActive
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {strategy.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-muted)]">
                        {latestSnapshot
                          ? formatDate(latestSnapshot.date, 'MMM d, yyyy')
                          : '-'}
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-muted)]">
                        {strategy._count.equityCurve}
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-muted)]">
                        {strategy._count.updates}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/strategies/${strategy.id}`}
                          className="text-sm font-semibold text-[var(--gold-400)] hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
