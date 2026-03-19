import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuditLogs } from '@/lib/audit'
import { formatDate } from '@/lib/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users,
  Activity,
  CreditCard,
  Clock,
  Video,
  TrendingUp,
  Calendar,
  Megaphone,
} from 'lucide-react'

const getDashboardData = unstable_cache(
  async () => {
    const [
      userCount,
      activeUsers,
      activeSubscriptions,
      trialMembers,
      recentUsers,
      recentAudits,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.membership.count({
        where: {
          status: 'active',
          OR: [
            { currentPeriodEnd: null },
            { currentPeriodEnd: { gte: new Date() } },
          ],
        },
      }),
      prisma.membership.count({ where: { status: 'trial' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          role: true,
        },
      }),
      getAuditLogs(10),
    ])

    return { userCount, activeUsers, activeSubscriptions, trialMembers, recentUsers, recentAudits }
  },
  ['admin-dashboard'],
  { revalidate: 60, tags: ['admin-dashboard'] }
)

export default async function AdminPage() {
  const { userCount, activeUsers, activeSubscriptions, trialMembers, recentUsers, recentAudits } =
    await getDashboardData()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>Admin</span> <span className="gold">Dashboard</span>
        </h1>
        <p className="subhead">Overview and quick actions</p>
      </div>

      {/* Key KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-[var(--text-muted)]">{activeUsers} active (30d)</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-[var(--text-muted)]">Paid members</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Trial Members</CardTitle>
            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialMembers}</div>
            <p className="text-xs text-[var(--text-muted)]">On trial period</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Conversion</CardTitle>
            <Activity className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trialMembers + activeSubscriptions > 0
                ? Math.round((activeSubscriptions / (trialMembers + activeSubscriptions)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-[var(--text-muted)]">Trial → Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="heading-2 text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/episodes/new"
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-gold-500/40 transition-colors"
          >
            <Video className="h-6 w-6 text-[var(--text-muted)] group-hover:text-gold-400 transition-colors" />
            <span className="text-sm font-medium text-[var(--text-strong)]">Create Episode</span>
          </Link>

          <Link
            href="/admin/signals/new"
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-gold-500/40 transition-colors"
          >
            <TrendingUp className="h-6 w-6 text-[var(--text-muted)] group-hover:text-gold-400 transition-colors" />
            <span className="text-sm font-medium text-[var(--text-strong)]">New Signal</span>
          </Link>

          <Link
            href="/admin/events/new"
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-gold-500/40 transition-colors"
          >
            <Calendar className="h-6 w-6 text-[var(--text-muted)] group-hover:text-gold-400 transition-colors" />
            <span className="text-sm font-medium text-[var(--text-strong)]">Create Event</span>
          </Link>

          <Link
            href="/admin/announce"
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-gold-500/40 transition-colors"
          >
            <Megaphone className="h-6 w-6 text-[var(--text-muted)] group-hover:text-gold-400 transition-colors" />
            <span className="text-sm font-medium text-[var(--text-strong)]">Announcement</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length > 0 ? (
                recentUsers.map((user: { id: string; name: string | null; email: string; createdAt: Date; role: string }) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(user.createdAt, 'MMM d')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No users yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <Link
                href="/admin/users"
                className="text-sm text-[var(--text-strong)] hover:text-[var(--text-strong)] font-medium"
              >
                View All Users →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading-2 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAudits.length > 0 ? (
                recentAudits.map((audit: { id: string; actor: { name: string | null }; action: string; subjectType: string; subjectId: string | null; createdAt: Date }) => (
                  <div key={audit.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {audit.actor.name} {audit.action}d {audit.subjectType}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {audit.subjectId && `ID: ${audit.subjectId}`}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(audit.createdAt, 'MMM d')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
