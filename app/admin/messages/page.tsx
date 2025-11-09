import { prisma } from '@/lib/prisma'
import { formatDate, timeago } from '@/lib/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  MessageSquare, 
  Search,
  User,
  Hash,
  Calendar,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      channel: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  })

  const channels = await prisma.channel.findMany({
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    },
    orderBy: {
      messages: {
        _count: 'desc'
      }
    }
  })

  const messageStats = {
    total: await prisma.message.count(),
    today: await prisma.message.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    thisWeek: await prisma.message.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    channels: channels.length
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>Message</span> <span className="gold">Management</span>
        </h1>
        <p className="subhead">View and manage community messages</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.total}</div>
            <p className="text-xs text-slate-500">All time</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.today}</div>
            <p className="text-xs text-slate-500">Messages today</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.thisWeek}</div>
            <p className="text-xs text-slate-500">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="heading-2 text-sm">Channels</CardTitle>
            <Hash className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.channels}</div>
            <p className="text-xs text-slate-500">Active channels</p>
          </CardContent>
        </Card>
      </div>

      {/* Channels Overview */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/admin/community/${channel.id}`}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{channel.name}</p>
                    <p className="text-sm text-slate-500">{channel.slug}</p>
                  </div>
                  <Badge variant="outline">
                    {channel._count.messages} messages
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Recent Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-sm text-slate-900">
                        {message.user.name || message.user.email}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {message.user.role}
                      </Badge>
                      <span className="text-xs text-slate-400">in</span>
                      <Link
                        href={`/admin/community/${message.channel.id}`}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                      >
                        #{message.channel.name}
                      </Link>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{message.body}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(message.createdAt, 'MMM d, yyyy h:mm a')}
                      <span className="text-slate-300">•</span>
                      {timeago(message.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No messages found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

