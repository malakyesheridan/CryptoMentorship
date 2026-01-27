import { prisma } from '../prisma'
import { emit } from '../events'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'

export async function sendEventReminders() {
  const now = new Date()
  
  // 24 hours before event
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const twentyFourHoursEvents = await prisma.event.findMany({
    where: {
      startAt: {
        gte: twentyFourHoursFromNow,
        lt: new Date(twentyFourHoursFromNow.getTime() + 60 * 60 * 1000) // within 1 hour window
      },
      visibility: { in: ['public', 'member'] }
    },
    include: {
      rsvps: {
        where: {
          status: { in: ['going', 'interested'] }
        },
        include: {
          user: {
            select: {
              id: true,
              notificationPreference: true
            }
          }
        }
      }
    }
  })

  // 60 minutes before event
  const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000)
  const sixtyMinutesEvents = await prisma.event.findMany({
    where: {
      startAt: {
        gte: sixtyMinutesFromNow,
        lt: new Date(sixtyMinutesFromNow.getTime() + 15 * 60 * 1000) // within 15 minute window
      },
      visibility: { in: ['public', 'member'] },
      joinUrl: { not: null }
    },
    include: {
      rsvps: {
        where: {
          status: 'going'
        },
        include: {
          user: {
            select: {
              id: true,
              notificationPreference: true
            }
          }
        }
      }
    }
  })

  const results = {
    twentyFourHourReminders: 0,
    sixtyMinuteReminders: 0,
    errors: [] as string[]
  }

  // Send 24-hour reminders
  for (const event of twentyFourHoursEvents) {
    for (const rsvp of event.rsvps) {
      try {
        // Check if user has notifications enabled
        const prefs = resolveNotificationPreferences(rsvp.user.notificationPreference ?? null)
        if (!shouldSendInAppNotification('announcement', prefs)) continue

        // Check if we already sent a reminder for this event to this user
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: rsvp.user.id,
            type: 'announcement',
            entityType: 'event',
            entityId: event.id,
            title: { contains: 'Event Reminder' },
            createdAt: {
              gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) // within last 2 hours
            }
          }
        })

        if (existingNotification) continue

        await prisma.notification.create({
          data: {
            userId: rsvp.user.id,
            type: 'announcement',
            entityType: 'event',
            entityId: event.id,
            title: 'Event Reminder: Tomorrow',
            body: `"${event.title}" starts tomorrow at ${event.startAt.toLocaleTimeString()}. Don't forget to join!`,
            url: `/events/${event.slug}`,
            channel: 'inapp'
          }
        })

        results.twentyFourHourReminders++
      } catch (error) {
        results.errors.push(`Failed to send 24h reminder for event ${event.id} to user ${rsvp.user.id}: ${error}`)
      }
    }
  }

  // Send 60-minute reminders
  for (const event of sixtyMinutesEvents) {
    for (const rsvp of event.rsvps) {
      try {
        // Check if user has notifications enabled
        const prefs = resolveNotificationPreferences(rsvp.user.notificationPreference ?? null)
        if (!shouldSendInAppNotification('announcement', prefs)) continue

        // Check if we already sent a reminder for this event to this user
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: rsvp.user.id,
            type: 'announcement',
            entityType: 'event',
            entityId: event.id,
            title: { contains: 'Starting Soon' },
            createdAt: {
              gte: new Date(now.getTime() - 30 * 60 * 1000) // within last 30 minutes
            }
          }
        })

        if (existingNotification) continue

        await prisma.notification.create({
          data: {
            userId: rsvp.user.id,
            type: 'announcement',
            entityType: 'event',
            entityId: event.id,
            title: 'Event Starting Soon',
            body: `"${event.title}" starts in 1 hour. Click to join the live session!`,
            url: event.joinUrl || `/events/${event.slug}`,
            channel: 'inapp'
          }
        })

        results.sixtyMinuteReminders++
      } catch (error) {
        results.errors.push(`Failed to send 60m reminder for event ${event.id} to user ${rsvp.user.id}: ${error}`)
      }
    }
  }

  return results
}
