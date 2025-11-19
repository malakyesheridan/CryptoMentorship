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
  BarChart3,
  Clock,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  TrendingUp
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Get all counts and data in parallel
  const [
    userCount,
    recentAudits,
    // Subscription stats
    membershipStats,
    activeSubscriptions,
    // Learning stats
    trackCount,
    enrollmentCount,
    completedEnrollments,
    certificateCount,
    // Portfolio stats - Daily Signals
    totalDailySignals,
    todayDailySignals,
    dailySignalsByTier,
    // User activity
    recentUsers,
    activeUsers
  ] = await Promise.all([
    prisma.user.count(),
    getAuditLogs(10),
    // Subscription stats
    prisma.membership.groupBy({
      by: ['status'],
      _count: { status: true }
    }),
    prisma.membership.count({
      where: {
        status: 'active',
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gte: new Date() } }
        ]
      }
    }),
    // Learning stats
    prisma.track.count(),
    prisma.enrollment.count(),
    prisma.enrollment.count({
      where: { completedAt: { not: null } }
    }),
    prisma.certificate.count(),
    // Portfolio stats - Daily Signals
    prisma.portfolioDailySignal.count(),
    prisma.portfolioDailySignal.count({
      where: {
        publishedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    prisma.portfolioDailySignal.groupBy({
      by: ['tier'],
      _count: { tier: true }
    }),
    // User activity
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true
      }
    }),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ])

  const membershipByTier = await prisma.membership.groupBy({
    by: ['tier'],
    _count: { tier: true }
  })

  // Calculate subscription breakdown
  const subscriptionBreakdown = {
    active: membershipStats.find(s => s.status === 'active')?._count.status || 0,
    trial: membershipStats.find(s => s.status === 'trial')?._count.status || 0,
    paused: membershipStats.find(s => s.status === 'paused')?._count.status || 0
  }

  // Calculate daily signals breakdown
  const dailySignalsBreakdown = {
    T1: dailySignalsByTier.find(t => t.tier === 'T1')?._count.tier || 0,
    T2: dailySignalsByTier.find(t => t.tier === 'T2')?._count.tier || 0,
    T3: dailySignalsByTier.find(t => t.tier === 'T3')?._count.tier || 0,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-hero text-4xl mb-2">
            <span>Admin</span> <span className="gold">Dashboard</span>
          </h1>
          <p className="subhead">Manage users and system settings</p>
        </div>
      </div>

      {/* Stats Grid - Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Users</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-slate-500">
              {activeUsers} active (30d)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid - Subscriptions */}
      <div>
        <h2 className="heading-2 text-xl mb-4">Subscriptions & Memberships</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscriptions}</div>
              <p className="text-xs text-slate-500">
                {subscriptionBreakdown.active} active, {subscriptionBreakdown.trial} trial
              </p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Membership Tiers</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membershipByTier.reduce((sum, t) => sum + t._count.tier, 0)}
              </div>
              <p className="text-xs text-slate-500">
                {membershipByTier.map(t => `${t._count.tier} ${t.tier}`).join(', ')}
              </p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Trial Members</CardTitle>
              <Clock className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptionBreakdown.trial}</div>
              <p className="text-xs text-slate-500">On trial period</p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Paused</CardTitle>
              <Activity className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptionBreakdown.paused}</div>
              <p className="text-xs text-slate-500">Paused subscriptions</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Grid - Learning */}
      <div>
        <h2 className="heading-2 text-xl mb-4">Learning Hub</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Learning Tracks</CardTitle>
              <BookOpen className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trackCount}</div>
              <p className="text-xs text-slate-500">Total tracks</p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Enrollments</CardTitle>
              <GraduationCap className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollmentCount}</div>
              <p className="text-xs text-slate-500">
                {completedEnrollments} completed
              </p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Certificates</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificateCount}</div>
              <p className="text-xs text-slate-500">Issued certificates</p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {enrollmentCount > 0 
                  ? Math.round((completedEnrollments / enrollmentCount) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-slate-500">Track completion</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Grid - Portfolio Daily Signals */}
      <div>
        <h2 className="heading-2 text-xl mb-4">Portfolio Daily Signals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Total Signals</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDailySignals}</div>
              <p className="text-xs text-slate-500">All-time daily signals</p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">Today&apos;s Signals</CardTitle>
              <Activity className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayDailySignals}</div>
              <p className="text-xs text-slate-500">Published today</p>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="heading-2 text-sm">By Tier</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dailySignalsBreakdown.T1 + dailySignalsBreakdown.T2 + dailySignalsBreakdown.T3}
              </div>
              <p className="text-xs text-slate-500">
                T1: {dailySignalsBreakdown.T1}, T2: {dailySignalsBreakdown.T2}, T3: {dailySignalsBreakdown.T3}
              </p>
            </CardContent>
          </Card>
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
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{user.name || user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(user.createdAt, 'MMM d')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No users yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Link 
                href="/admin/users"
                className="text-sm text-slate-600 hover:text-slate-900 font-medium"
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
                recentAudits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {audit.actor.name} {audit.action}d {audit.subjectType}
                      </p>
                      <p className="text-xs text-slate-500">
                        {audit.subjectId && `ID: ${audit.subjectId}`}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(audit.createdAt, 'MMM d')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
