import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EventDetailHeader } from '@/components/EventDetailHeader'
import { EventResources } from '@/components/EventResources'
import { MDXRenderer } from '@/components/MDXRenderer'
import { Questions } from '@/components/Questions'
import { ReplaySection } from '@/components/ReplaySection'
import { renderMDX } from '@/lib/mdx'
import { ViewTracker } from '@/components/ViewTracker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Users, User, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatTime, timeago } from '@/lib/dates'
import type { EventDetail } from '@/types/events'

export const dynamic = 'force-dynamic'

interface EventDetailPageProps {
  params: {
    slug: string
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const session = await getServerSession(authOptions)

  const eventRecord = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      rsvps: {
        where: session?.user?.id ? { userId: session.user.id } : undefined,
        select: {
          status: true,
          notes: true,
          createdAt: true,
        }
      },
      questions: {
        where: { archivedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          votes: {
            where: session?.user?.id ? { userId: session.user.id } : undefined,
            select: { id: true }
          },
          _count: {
            select: {
              votes: true
            }
          }
        },
        orderBy: [
          { votes: { _count: 'desc' } },
          { createdAt: 'desc' }
        ]
      },
      chapters: {
        orderBy: { startMs: 'asc' }
      },
      transcript: {
        include: {
          segments: {
            orderBy: { startMs: 'asc' }
          }
        }
      },
      _count: {
        select: {
          rsvps: {
            where: { status: 'going' }
          }
        }
      }
    }
  })

  if (!eventRecord) {
    notFound()
  }

  // Guard visibility rules
  if (eventRecord.visibility === 'admin' && session?.user?.role !== 'admin') {
    notFound()
  }
  if (eventRecord.visibility === 'member' && !session?.user?.id) {
    notFound()
  }

  const event: EventDetail = {
    slug: eventRecord.slug,
    title: eventRecord.title,
    date: eventRecord.startAt,
    location: eventRecord.locationText ?? null,
    coverUrl: null,
    summary: eventRecord.description ?? null,
    transcript: null,
    videoUrl: eventRecord.recordingUrl ?? null,
    tags: null,
  }

  const coverImage = event.coverUrl ?? '/images/placeholders/event-cover.jpg'
  const now = new Date()
  const isUpcoming = eventRecord.startAt > now
  const isLive = eventRecord.startAt <= now && eventRecord.endAt > now
  const isPast = eventRecord.endAt <= now
  const userRsvp = eventRecord.rsvps[0] ? {
    status: eventRecord.rsvps[0].status,
    notes: eventRecord.rsvps[0].notes ?? undefined
  } : undefined

  const mdxSummary = event.summary ? await renderMDX(event.slug, event.summary, { frontmatter: { title: event.title } }) : null
  const transformedQuestions = eventRecord.questions.map(question => ({
    ...question,
    voteCount: question._count.votes,
    userVoted: question.votes.length > 0,
    votes: undefined,
    _count: undefined
  }))

  const headerEvent = {
    id: eventRecord.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary ?? undefined,
    startAt: eventRecord.startAt,
    endAt: eventRecord.endAt,
    timezone: eventRecord.timezone,
    visibility: eventRecord.visibility,
    locationType: eventRecord.locationType,
    locationText: eventRecord.locationText ?? undefined,
    joinUrl: eventRecord.joinUrl ?? undefined,
    capacity: eventRecord.capacity ?? undefined,
    host: eventRecord.host ? { name: eventRecord.host.name } : null,
    _count: eventRecord._count,
  }

  return (
    <div className="container-main section-padding">
      <nav className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Link href="/events" className="hover:text-gold-600 transition-colors">
            Events
          </Link>
          <span>/</span>
          <span className="text-slate-800">{event.title}</span>
        </div>
      </nav>

      <ViewTracker entityType="content" entityId={eventRecord.id} disabled={!session?.user?.id} />
      <div className="mb-8">
        <img
          src={coverImage}
          alt={event.title}
          className="w-full rounded-xl object-cover max-h-[420px]"
        />
      </div>

      <EventDetailHeader
        event={headerEvent}
        userRsvp={userRsvp}
        userRole={session?.user?.role}
        isUpcoming={isUpcoming}
        isLive={isLive}
        isPast={isPast}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-6">
          {event.summary && (
            <Card>
              <CardContent className="p-6">
                <h2 className="heading-2 text-xl mb-4">About This Event</h2>
                {mdxSummary ? (
                  <MDXRenderer source={mdxSummary.source} slug={event.slug} hash={mdxSummary.hash} />
                ) : (
                  <div className="prose prose-lg max-w-none">
                    <p className="subhead">{event.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {event.transcript && (
            <Card>
              <CardContent className="p-6">
                <h3 className="heading-2 text-lg mb-4">Transcript</h3>
                <div className="prose max-w-none">
                  {event.transcript}
                </div>
              </CardContent>
            </Card>
          )}

          {isPast && (eventRecord.recordingUrl || eventRecord.resources) && (
            <EventResources
              recordingUrl={eventRecord.recordingUrl ?? undefined}
              resources={eventRecord.resources as any}
              eventTitle={event.title}
            />
          )}

          {isPast && event.videoUrl && (
            <ReplaySection
              recordingUrl={event.videoUrl}
              chapters={eventRecord.chapters}
              transcript={eventRecord.transcript as any}
              eventTitle={event.title}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="heading-2 text-lg mb-4">Event Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {formatDate(event.date, 'PPP')}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatTime(eventRecord.startAt)} - {formatTime(eventRecord.endAt)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isUpcoming && `Starts ${timeago(eventRecord.startAt)}`}
                      {isLive && 'Live now'}
                      {isPast && 'Event ended'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {eventRecord.locationType === 'online' ? 'Online Event' : 'In Person'}
                    </p>
                    {event.location && (
                      <p className="text-sm text-slate-600">{event.location}</p>
                    )}
                  </div>
                </div>

                {eventRecord.host && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Host</p>
                      <p className="text-sm text-slate-600">{eventRecord.host.name}</p>
                    </div>
                  </div>
                )}

                {eventRecord.capacity && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800">Capacity</p>
                      <p className="text-sm text-slate-600">
                        {eventRecord._count.rsvps}/{eventRecord.capacity} attendees
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {eventRecord.visibility}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {eventRecord.locationType.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="heading-2 text-lg mb-4">Actions</h3>
              <div className="space-y-3">
                {isUpcoming && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/api/events/${event.slug}/ics`}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Link>
                  </Button>
                )}

                {isLive && eventRecord.joinUrl && (
                  <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                    <Link href={eventRecord.joinUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Live Session
                    </Link>
                  </Button>
                )}

                {isPast && event.videoUrl && (
                  <Button className="w-full" asChild>
                    <Link href={event.videoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Watch Recording
                    </Link>
                  </Button>
                )}

                {session?.user?.role === 'admin' && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/admin/events/${eventRecord.id}`}>
                      Edit Event
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Questions 
            eventId={eventRecord.id} 
            initialQuestions={transformedQuestions as any}
          />
        </div>
      </div>
    </div>
  )
}
