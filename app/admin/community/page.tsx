import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare,
  Users,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CommunityPage() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-two-tone text-3xl mb-2">
            <span>Community</span> <span className="gold">Manager</span>
          </h1>
          <p className="text-slate-600">Manage channels and community discussions</p>
        </div>
        <Button asChild className="btn-gold">
          <Link href="/admin/community/new">
            <Plus className="w-4 h-4 mr-2" />
            New Channel
          </Link>
        </Button>
      </div>

      {/* Channels Table */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Channels</CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No channels yet</h3>
              <p className="text-slate-500 mb-6">Create your first channel to get the community started</p>
              <Button asChild className="btn-gold">
                <Link href="/admin/community/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Channel
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">
                        #{channel.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {channel._count.messages} messages
                      </Badge>
                    </div>
                    {channel.description && (
                      <p className="text-sm text-slate-600 mb-2">{channel.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {formatDate(channel.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-slate-600 hover:text-slate-700">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
