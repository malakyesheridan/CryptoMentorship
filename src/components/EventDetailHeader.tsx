'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatTime, timeago } from '@/lib/dates'
import { Calendar, Clock, MapPin, Users, User, ExternalLink, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface EventDetailHeaderProps {
  event: {
    id: string
    slug: string
    title: string
    summary?: string
    startAt: Date
    endAt: Date
    timezone: string
    visibility: string
    locationType: string
    locationText?: string
    joinUrl?: string
    capacity?: number
    host?: {
      name: string | null
    } | null
    _count: {
      rsvps: number
    }
  }
  userRsvp?: {
    status: string
    notes?: string
  }
  userRole?: string
  isUpcoming: boolean
  isLive: boolean
  isPast: boolean
}

export function EventDetailHeader({
  event,
  userRsvp,
  userRole,
  isUpcoming,
  isLive,
  isPast
}: EventDetailHeaderProps) {
  const [isRsvping, setIsRsvping] = useState(false)

  const handleRSVP = async (status: 'going' | 'interested' | 'declined') => {
    if (!userRole) {
      toast.error('Please sign in to RSVP')
      return
    }
    
    setIsRsvping(true)
    try {
      const response = await fetch(`/api/events/${event.slug}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to RSVP')
      }
      
      toast.success(`RSVP updated to ${status}`)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to RSVP')
    } finally {
      setIsRsvping(false)
    }
  }

  const getVisibilityBadge = () => {
    switch (event.visibility) {
      case 'public':
        return <Badge variant="default">Public Event</Badge>
      case 'member':
        return <Badge variant="preview">Members Only</Badge>
      case 'admin':
        return <Badge variant="locked">Admin Only</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    if (isLive) return <Badge variant="destructive">🔴 Live Now</Badge>
    if (isUpcoming) return <Badge variant="default">Upcoming</Badge>
    if (isPast) return <Badge variant="outline">Past Event</Badge>
    return null
  }

  const getCapacityText = () => {
    if (!event.capacity) return null
    const remaining = event.capacity - event._count.rsvps
    if (remaining <= 0) return 'Full'
    if (remaining <= 5) return `${remaining} spots left`
    return `${remaining}/${event.capacity} spots available`
  }

  const canJoinLive = () => {
    return isLive && event.joinUrl
  }

  const getTimeUntilStart = () => {
    if (isPast) return 'Event has ended'
    if (isLive) return 'Event is live now'
    if (isUpcoming) return `Starts ${timeago(event.startAt)}`
    return ''
  }

  return (
    <div className="space-y-6">
      {/* Title and Status */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {getVisibilityBadge()}
            {getStatusBadge()}
          </div>
          <h1 className="heading-hero text-4xl sm:text-5xl mb-4">
            {event.title}
          </h1>
          {event.summary && (
            <p className="subhead text-xl max-w-3xl">
              {event.summary}
            </p>
          )}
        </div>
      </div>

      {/* Event Meta */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800">
                  {formatDate(event.startAt, 'PPP')}
                </p>
                <p className="text-sm text-slate-600">
                  {formatTime(event.startAt)} - {formatTime(event.endAt)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {getTimeUntilStart()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800">
                  {event.locationType === 'online' ? 'Online Event' : 'In Person'}
                </p>
                {event.locationText && (
                  <p className="text-sm text-slate-600">{event.locationText}</p>
                )}
              </div>
            </div>

            {event.host && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-800">Host</p>
                  <p className="text-sm text-slate-600">{event.host.name}</p>
                </div>
              </div>
            )}

            {event.capacity && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-800">Capacity</p>
                  <p className={`text-sm ${getCapacityText() === 'Full' ? 'text-red-600' : 'text-slate-600'}`}>
                    {getCapacityText()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RSVP Controls */}
      {userRole && isUpcoming && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="heading-2 text-lg mb-2">RSVP</h3>
                <p className="text-sm text-slate-600">
                  Let us know if you&apos;ll be attending this event
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={userRsvp?.status === 'going' ? 'default' : 'outline'}
                  onClick={() => handleRSVP('going')}
                  disabled={isRsvping || getCapacityText() === 'Full'}
                  className={userRsvp?.status === 'going' ? 'bg-gold-500 hover:bg-gold-600' : ''}
                >
                  {userRsvp?.status === 'going' && <CheckCircle className="h-4 w-4 mr-2" />}
                  Going
                </Button>
                <Button
                  variant={userRsvp?.status === 'interested' ? 'default' : 'outline'}
                  onClick={() => handleRSVP('interested')}
                  disabled={isRsvping}
                  className={userRsvp?.status === 'interested' ? 'bg-gold-500 hover:bg-gold-600' : ''}
                >
                  {userRsvp?.status === 'interested' && <CheckCircle className="h-4 w-4 mr-2" />}
                  Interested
                </Button>
                <Button
                  variant={userRsvp?.status === 'declined' ? 'default' : 'outline'}
                  onClick={() => handleRSVP('declined')}
                  disabled={isRsvping}
                  className={userRsvp?.status === 'declined' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  {userRsvp?.status === 'declined' && <CheckCircle className="h-4 w-4 mr-2" />}
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Join Live Button */}
      {canJoinLive() && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="heading-2 text-lg mb-2 text-green-800">🔴 Live Now</h3>
                <p className="text-sm text-green-700">
                  This event is currently live. Click below to join the session.
                </p>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700" 
                size="lg"
                asChild
              >
                <a href={event.joinUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Join Live Session
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
