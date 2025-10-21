import { prisma } from '@/lib/prisma'
import { getAuditLogs } from '@/lib/audit'
import { formatDate } from '@/lib/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Play, 
  TrendingUp, 
  BookOpen, 
  MessageSquare, 
  Users,
  Activity
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Get counts
  const [
    contentCount,
    episodeCount,
    userCount,
    messageCount,
    recentContent,
    recentAudits
  ] = await Promise.all([
    prisma.content.count(),
    prisma.episode.count(),
    prisma.user.count(),
    prisma.message.count(),
    prisma.content.findMany({
      take: 5,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        kind: true,
        publishedAt: true,
        locked: true
      }
    }),
    getAuditLogs(10)
  ])

  const contentByKind = await prisma.content.groupBy({
    by: ['kind'],
    _count: { kind: true }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>Admin</span> <span className="gold">Dashboard</span>
        </h1>
        <p className="subhead">Manage your crypto portal content and users</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contentCount}</div>
            <p className="text-xs text-slate-500">
              {contentByKind.map(c => `${c._count.kind} ${c.kind}`).join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Episodes</CardTitle>
            <Play className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{episodeCount}</div>
            <p className="text-xs text-slate-500">Crypto Compass episodes</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Users</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-slate-500">Registered members</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageCount}</div>
            <p className="text-xs text-slate-500">Community messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Content */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="heading-2 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContent.map((content) => (
                <div key={content.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{content.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {content.kind}
                      </Badge>
                      {content.locked && (
                        <Badge className="badge-locked text-xs">Locked</Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDate(content.publishedAt, 'MMM d')}
                  </span>
                </div>
              ))}
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
              {recentAudits.map((audit) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
