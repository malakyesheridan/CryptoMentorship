import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { Calendar, Plus, Search, Users, Clock, MapPin, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatTime, timeago } from '@/lib/dates'

export const dynamic = 'force-dynamic'

interface AdminEventsPageProps {
  searchParams: {
    search?: string
    scope?: string
    visibility?: string
    locationType?: string
    cursor?: string
  }
}

export default async function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
    return (
      <div className="container-main section-padding">
        <EmptyState
          icon={<Calendar />}
          title="Access Denied"
          description="You need admin or editor permissions to manage events."
        />
      </div>
    )
  }

  const search = searchParams.search
  const scope = searchParams.scope || 'upcoming'
  const visibility = searchParams.visibility
  const locationType = searchParams.locationType
  const cursor = searchParams.cursor
  const limit = 20

  // Build where clause
  const where: any = {}
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (scope === 'upcoming') {
    where.startAt = { gte: new Date() }
  } else if (scope === 'past') {
    where.startAt = { lt: new Date() }
  }

  if (visibility) {
    where.visibility = visibility
  }

  if (locationType) {
    where.locationType = locationType
  }

  // Get events
  const events = await prisma.event.findMany({
    where,
    include: {
      host: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      _count: {
        select: {
          rsvps: {
            where: { status: 'going' }
          }
        }
      }
    },
    orderBy: scope === 'upcoming' ? { startAt: 'asc' } : { startAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })

  const hasNextPage = events.length > limit
  const items = hasNextPage ? events.slice(0, -1) : events
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

  // Get stats
  const stats = await prisma.event.aggregate({
    _count: {
      id: true
    }
  })

  const upcomingCount = await prisma.event.count({
    where: { startAt: { gte: new Date() } }
  })

  const pastCount = await prisma.event.count({
    where: { startAt: { lt: new Date() } }
  })

  const totalRSVPs = await prisma.rSVP.count()

  return (
    <div className="container-main section-padding">
      {/* Header */}
      <SectionHeader 
        title="Event Management" 
        subtitle="Create and manage live sessions and events"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Events</p>
                <p className="text-2xl font-bold text-slate-800">{stats._count.id}</p>
              </div>
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Upcoming</p>
                <p className="text-2xl font-bold text-slate-800">{upcomingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Past Events</p>
                <p className="text-2xl font-bold text-slate-800">{pastCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total RSVPs</p>
                <p className="text-2xl font-bold text-slate-800">{totalRSVPs}</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={scope === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="/admin/events?scope=upcoming">Upcoming</Link>
            </Button>
            <Button
              variant={scope === 'past' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="/admin/events?scope=past">Past</Link>
            </Button>
            <Button
              variant={scope === 'all' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="/admin/events?scope=all">All</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={visibility === 'public' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/admin/events?scope=${scope}&visibility=public`}>Public</Link>
            </Button>
            <Button
              variant={visibility === 'member' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/admin/events?scope=${scope}&visibility=member`}>Members</Link>
            </Button>
            <Button
              variant={visibility === 'admin' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/admin/events?scope=${scope}&visibility=admin`}>Admin</Link>
            </Button>
          </div>
        </div>

        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search events..."
            className="pl-10"
            defaultValue={search}
          />
        </div>
      </div>

      {/* Events Table */}
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="heading-2 text-lg">{event.title}</h3>
                      <Badge variant="outline" className="capitalize">
                        {event.visibility}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {event.locationType.replace('_', ' ')}
                      </Badge>
                      {event.startAt > new Date() ? (
                        <Badge variant="default">Upcoming</Badge>
                      ) : (
                        <Badge variant="outline">Past</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.startAt, 'PPP')} at {formatTime(event.startAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {event.locationType === 'online' ? 'Online' : 'In Person'}
                          {event.locationText && ` • ${event.locationText}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{event._count.rsvps} RSVPs</span>
                        {event.capacity && (
                          <span className="text-slate-400">
                            ({event._count.rsvps}/{event.capacity})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/events/${event.slug}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/events/${event.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/events/${event.id}/attendees`}>
                        <Users className="h-4 w-4" />
                      </Link>
                    </Button>
                    {session.user.role === 'admin' && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {hasNextPage && (
            <div className="text-center pt-6">
              <Button variant="outline" asChild>
                <Link href={`/admin/events?scope=${scope}&cursor=${nextCursor}`}>
                  Load more events
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Calendar />}
          title="No events found"
          description="No events match your current filters."
          action={{
            label: "Create First Event",
            href: "/admin/events/new"
          }}
        />
      )}
    </div>
  )
}
