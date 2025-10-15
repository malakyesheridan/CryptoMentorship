import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/SectionHeader'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  ExternalLink,
  Edit,
  Trash2,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering for admin pages (auth-gated)
export const dynamic = 'force-dynamic'

interface EventDetailPageProps {
  params: {
    eventId: string
  }
}

async function getEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      },
      questions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  return event
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/admin')
  }

  const event = await getEvent(params.eventId)

  if (!event) {
    redirect('/admin/events')
  }

  const attendeeCount = event.rsvps.length
  const questionCount = event.questions.length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/admin/events">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </Link>
          
          <SectionHeader
            title={event.title}
            subtitle="Event Details"
            actions={
              <div className="flex gap-2">
                <Link href={`/admin/events/${event.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Description</h4>
                  <p className="text-slate-600">{event.description || 'No description provided'}</p>
                </div>
                
                {event.summary && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Summary</h4>
                    <p className="text-slate-600">{event.summary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {new Date(event.startAt).toLocaleDateString()} at{' '}
                      {new Date(event.startAt).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {event.startAt && event.endAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">
                        {Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / (1000 * 60))} minutes
                      </span>
                    </div>
                  )}
                  
                  {event.locationText && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">{event.locationText}</span>
                    </div>
                  )}
                  
                  {event.joinUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                      <a 
                        href={event.joinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Join Event
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={event.visibility === 'public' ? 'default' : 'secondary'}>
                    {event.visibility === 'public' ? 'Public' : event.visibility === 'member' ? 'Members Only' : 'Admin Only'}
                  </Badge>
                  <Badge variant="outline">
                    {event.visibility === 'public' ? 'All Users' : event.visibility === 'member' ? 'Members' : 'Admins'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            {event.resources && (
              <Card>
                <CardHeader>
                  <CardTitle>Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {JSON.parse(event.resources).map((resource: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-slate-500" />
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {resource.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Attendees</span>
                  </div>
                  <span className="font-medium">{attendeeCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Questions</span>
                  </div>
                  <span className="font-medium">{questionCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/admin/events/${event.id}/attendees`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Attendees
                  </Button>
                </Link>
                
                <Link href={`/admin/events/${event.id}/questions`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Questions
                  </Button>
                </Link>
                
                {event.joinUrl && (
                  <a
                    href={event.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview Event
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
