import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { EventCard } from '@/components/EventCard'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Filter, Plus, Users, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'

interface EventsPageProps {
  searchParams: {
    scope?: string
    visibility?: string
    locationType?: string
    hostId?: string
    month?: string
    cursor?: string
  }
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const session = await getServerSession(authOptions)
  const scope = searchParams.scope || 'upcoming'
  const visibility = searchParams.visibility || 'member'
  const locationType = searchParams.locationType
  const hostId = searchParams.hostId
  const month = searchParams.month
  const cursor = searchParams.cursor
  const limit = 20

  // Build query params
  const queryParams = new URLSearchParams()
  queryParams.set('scope', scope)
  queryParams.set('visibility', visibility)
  if (locationType) queryParams.set('locationType', locationType)
  if (hostId) queryParams.set('hostId', hostId)
  if (month) queryParams.set('month', month)
  if (cursor) queryParams.set('cursor', cursor)

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/events?${queryParams.toString()}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Events API error:', response.status, response.statusText)
      // Return empty state instead of throwing
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="container mx-auto px-4 py-12">
            <SectionHeader 
              title="Events" 
              subtitle="Upcoming and past events"
            />
            <EmptyState
              icon={<Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
              title="Events temporarily unavailable"
              description="We're working on bringing events back online. Please check back soon."
            />
          </div>
        </div>
      )
    }
    
    const data = await response.json()
    const events = data.events || []
    const pagination = data.pagination || {}

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
          <div className="relative container mx-auto px-4 py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
                <span className="text-white">Community</span>
                <span className="text-yellow-400 ml-4">Events</span>
              </h1>
              <p className="text-xl text-slate-300 mb-8">
                Join our educational sessions, networking events, and community gatherings
              </p>
              <div className="flex items-center justify-center gap-6 text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">{events.length} Events</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Active Community</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Regular Sessions</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Online & In-Person</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          {/* Admin Create Button */}
          {session?.user?.role === 'admin' && (
            <div className="mb-8 text-center">
              <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg">
                <Link href="/admin/events/new">
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Event
                </Link>
              </Button>
            </div>
          )}

          {/* Enhanced Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">Filter Events:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge 
                variant={scope === 'upcoming' ? 'default' : 'outline'}
                className={`cursor-pointer transition-all duration-200 px-4 py-2 ${
                  scope === 'upcoming' 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Link href="?scope=upcoming">Upcoming Events</Link>
              </Badge>
              <Badge 
                variant={scope === 'past' ? 'default' : 'outline'}
                className={`cursor-pointer transition-all duration-200 px-4 py-2 ${
                  scope === 'past' 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Link href="?scope=past">Past Events</Link>
              </Badge>
              <Badge 
                variant={scope === 'all' ? 'default' : 'outline'}
                className={`cursor-pointer transition-all duration-200 px-4 py-2 ${
                  scope === 'all' 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Link href="?scope=all">All Events</Link>
              </Badge>
            </div>
          </div>

          {/* Events Grid */}
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event: any) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  slug={event.slug}
                  title={event.title}
                  summary={event.summary}
                  startAt={event.startAt}
                  endAt={event.endAt}
                  timezone={event.timezone}
                  visibility={event.visibility}
                  locationType={event.locationType}
                  locationText={event.locationText}
                  capacity={event.capacity}
                  host={event.host}
                  userRole={session?.user?.role}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <EmptyState
                icon={<Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
                title="No events found"
                description="There are no events matching your current filters. Check back later for new events!"
              />
            </div>
          )}

          {/* Pagination */}
          {pagination.hasNextPage && (
            <div className="mt-12 text-center">
              <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg">
                <Link href={`?${new URLSearchParams({ ...searchParams, cursor: pagination.nextCursor }).toString()}`}>
                  Load More Events
                </Link>
              </Button>
            </div>
          )}

          {/* Admin Empty State */}
          {session?.user?.role === 'admin' && events.length === 0 && (
            <div className="mt-12 text-center">
              <EmptyState
                icon={<Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
                title="No events created yet"
                description="Create your first event to get started with community engagement."
              />
              <div className="mt-6">
                <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg">
                  <Link href="/admin/events/new">Create First Event</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading events:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-20 text-center">
          <EmptyState
            icon={<Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
            title="Error loading events"
            description="Something went wrong while loading events. Please try again."
          />
          <div className="mt-6">
            <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg">
              <Link href="/events">Try Again</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }
}