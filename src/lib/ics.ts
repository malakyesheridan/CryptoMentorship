import { Event } from '@prisma/client'

interface EventWithHost extends Event {
  host?: {
    name: string | null
    email: string | null
  } | null
}

export function buildICS(event: EventWithHost, type: 'single' | 'feed' = 'single'): string {
  const now = new Date()
  
  // Format dates for ICS (UTC)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  const uid = type === 'single' 
    ? `${event.id}@cryptoportal.com`
    : `feed-${now.getTime()}@cryptoportal.com`

  const summary = event.title
  const description = event.summary || event.description || ''
  const location = event.locationType === 'online' 
    ? (event.locationText || 'Online')
    : (event.locationText || 'TBD')

  const url = `${process.env.NEXTAUTH_URL || 'https://cryptoportal.com'}/events/${event.slug}`

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crypto Portal//Live Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    '',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${formatICSDate(event.startAt)}`,
    `DTEND:${formatICSDate(event.endAt)}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    `URL:${url}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    '',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event starting in 1 hour',
    'END:VALARM',
    '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return ics
}

export function buildICSFeed(events: EventWithHost[]): string {
  const now = new Date()
  
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crypto Portal//Live Sessions Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Crypto Portal Events`,
    `X-WR-CALDESC:Upcoming live sessions and events`,
    ''
  ]

  events.forEach(event => {
    const uid = `${event.id}@cryptoportal.com`
    const summary = event.title
    const description = event.summary || event.description || ''
    const location = event.locationType === 'online' 
      ? (event.locationText || 'Online')
      : (event.locationText || 'TBD')
    const url = `${process.env.NEXTAUTH_URL || 'https://cryptoportal.com'}/events/${event.slug}`

    ics.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${formatICSDate(event.startAt)}`,
      `DTEND:${formatICSDate(event.endAt)}`,
      `DTSTAMP:${formatICSDate(now)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      `URL:${url}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    )
  })

  ics.push('END:VCALENDAR')
  
  return ics.join('\r\n')
}
