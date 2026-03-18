import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flag, AlertTriangle, Users, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CommunityModerationPage() {
  await requireRole('admin')

  const [
    pendingReports,
    totalReports,
    activeMutes,
    activeBans,
    recentPosts,
    recentComments,
  ] = await Promise.all([
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.report.count(),
    prisma.userModeration.count({ where: { action: 'MUTE', isActive: true } }),
    prisma.userModeration.count({ where: { action: 'BAN', isActive: true } }),
    prisma.post.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.comment.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ])

  const reports = await prisma.report.findMany({
    where: { status: 'PENDING' },
    include: {
      reporter: { select: { id: true, name: true } },
      post: { select: { id: true, body: true, author: { select: { name: true } } } },
      comment: { select: { id: true, body: true, author: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>Community</span> <span className="gold">Moderation</span>
        </h1>
        <p className="subhead">Manage reports, mutes, and bans</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Pending Reports</CardTitle>
            <Flag className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports}</div>
            <p className="text-xs text-[var(--text-muted)]">{totalReports} total reports</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Active Mutes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMutes}</div>
            <p className="text-xs text-[var(--text-muted)]">{activeBans} bans</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Posts (24h)</CardTitle>
            <MessageSquare className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentPosts}</div>
            <p className="text-xs text-[var(--text-muted)]">New posts today</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Comments (24h)</CardTitle>
            <Users className="h-4 w-4 text-[var(--text-muted)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentComments}</div>
            <p className="text-xs text-[var(--text-muted)]">New comments today</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reports */}
      <Card className="card">
        <CardHeader>
          <CardTitle className="heading-2 flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Pending Reports ({pendingReports})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border border-[var(--border-subtle)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {report.postId ? 'Post' : 'Comment'}
                      </Badge>
                      <span className="text-sm text-[var(--text-muted)]">
                        Reported by {report.reporter.name ?? 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-strong)] mb-2">
                    <strong>Reason:</strong> {report.reason}
                  </p>
                  {report.post && (
                    <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-page)] rounded p-2 line-clamp-2">
                      Post by {report.post.author.name}: {report.post.body}
                    </p>
                  )}
                  {report.comment && (
                    <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-page)] rounded p-2 line-clamp-2">
                      Comment by {report.comment.author.name}: {report.comment.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">
              No pending reports
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href="/admin" className="text-sm text-[var(--gold-400)] hover:underline font-medium">
          Back to Admin Dashboard
        </Link>
      </div>
    </div>
  )
}
