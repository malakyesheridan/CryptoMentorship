'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatTime, timeago } from '@/lib/dates'
import { Calendar, MapPin, Users, Clock, User } from 'lucide-react'
import { useState } from 'react'

interface EventCardProps {
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
  capacity?: number
  host?: {
    name: string | null
  } | null
  rsvps?: Array<{
    status: string
    notes?: string
  }>
  _count?: {
    rsvps: number
  }
  userRole?: string
}

export function EventCard({
  id,
  slug,
  title,
  summary,
  startAt,
  endAt,
  timezone,
  visibility,
  locationType,
  locationText,
  capacity,
  host,
  rsvps = [],
  _count = { rsvps: 0 },
  userRole
}: EventCardProps) {
  const [isRsvping, setIsRsvping] = useState(false)
  const now = new Date()
  const isUpcoming = startAt > now
  const isLive = startAt <= now && endAt > now
  const isPast = endAt <= now
  const userRsvp = rsvps[0]
  
  // Check if user can see this event
  const canView = visibility === 'public' || 
                  (visibility === 'member' && userRole) ||
                  (visibility === 'admin' && userRole === 'admin')

  if (!canView) return null

  const handleRSVP = async (status: 'going' | 'interested' | 'declined') => {
    if (!userRole) return
    
    setIsRsvping(true)
    try {
      const response = await fetch(`/api/events/${slug}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        throw new Error('Failed to RSVP')
      }
      
      // Refresh the page to update RSVP status
      window.location.reload()
    } catch (error) {
      console.error('RSVP error:', error)
    } finally {
      setIsRsvping(false)
    }
  }

  const getVisibilityBadge = () => {
    switch (visibility) {
      case 'public':
        return <Badge variant="default">Public</Badge>
      case 'member':
        return <Badge variant="preview">Members Only</Badge>
      case 'admin':
        return <Badge variant="locked">Admin Only</Badge>
      default:
        return null
    }
  }

  const getLocationIcon = () => {
    return locationType === 'online' ? <Calendar className="h-4 w-4" /> : <MapPin className="h-4 w-4" />
  }

  const getTimeUntilStart = () => {
    if (isPast) return 'Event ended'
    if (isLive) return 'Live now'
    if (isUpcoming) return `Starts ${timeago(startAt)}`
    return ''
  }

  const getCapacityText = () => {
    if (!capacity) return null
    const remaining = capacity - _count.rsvps
    if (remaining <= 0) return 'Full'
    if (remaining <= 5) return `${remaining} spots left`
    return `${remaining}/${capacity} spots`
  }

  return (
    <Card className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200" data-testid="event-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {getVisibilityBadge()}
              {isLive && <Badge variant="destructive" className="bg-red-500 text-white">Live</Badge>}
            </div>
            <Link href={`/events/${slug}`} className="group">
              <h3 className="text-xl font-semibold text-slate-900 group-hover:text-yellow-600 transition-colors mb-3 line-clamp-2">
                {title}
              </h3>
            </Link>
            {summary && (
              <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                {summary}
              </p>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>{formatDate(startAt, 'PPP')} at {formatTime(startAt)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs">{getTimeUntilStart()}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {getLocationIcon()}
            <span>
              {locationType === 'online' ? 'Online' : 'In Person'}
              {locationText && ` • ${locationText}`}
            </span>
          </div>

          {host && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="h-4 w-4" />
              <span>Hosted by {host.name}</span>
            </div>
          )}

          {capacity && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4" />
              <span className={getCapacityText() === 'Full' ? 'text-red-600' : ''}>
                {getCapacityText()}
              </span>
            </div>
          )}
        </div>

        {/* RSVP Controls */}
        {userRole && isUpcoming && (
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={userRsvp?.status === 'going' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRSVP('going')}
              disabled={isRsvping || getCapacityText() === 'Full'}
              className={userRsvp?.status === 'going' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'hover:bg-yellow-50 hover:border-yellow-300'}
            >
              Going
            </Button>
            <Button
              variant={userRsvp?.status === 'interested' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRSVP('interested')}
              disabled={isRsvping}
              className={userRsvp?.status === 'interested' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'hover:bg-yellow-50 hover:border-yellow-300'}
            >
              Interested
            </Button>
            <Button
              variant={userRsvp?.status === 'declined' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRSVP('declined')}
              disabled={isRsvping}
              className={userRsvp?.status === 'declined' ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-red-50 hover:border-red-300'}
            >
              Decline
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Link href={`/events/${slug}`}>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-yellow-600 hover:bg-yellow-50">
              View Details
            </Button>
          </Link>
          
          {isUpcoming && (
            <Link href={`/api/events/${slug}/ics`}>
              <Button variant="outline" size="sm" className="border-slate-300 hover:border-yellow-300 hover:bg-yellow-50">
                Add to Calendar
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
