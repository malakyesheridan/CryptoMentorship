import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Check, CheckCheck, Filter } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { EmptyState } from '@/components/EmptyState'
import { NotificationFilters } from '@/components/NotificationFilters'
import { NotificationList } from '@/components/NotificationList'

// Revalidate every 2 minutes - notifications need to be relatively fresh
export const revalidate = 120

interface NotificationsPageProps {
  searchParams: {
    filter?: string
    cursor?: string
  }
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return (
      <div className="container-main section-padding">
        <div className="text-center">
          <h1 className="heading-hero text-4xl mb-4">Sign in required</h1>
          <p className="subhead">Please sign in to view your notifications.</p>
        </div>
      </div>
    )
  }

  const filter = searchParams.filter || 'all'
  const cursor = searchParams.cursor
  const limit = 20

  // Build where clause based on filter
  const where: any = { userId: session.user.id, channel: 'inapp' }
  
  if (filter === 'unread') {
    where.readAt = null
  } else if (filter === 'mentions') {
    where.type = { in: ['community_mention', 'mention'] } // Include both new and legacy
  } else if (filter === 'content') {
    where.type = { 
      in: [
        'portfolio_update', 'crypto_compass', 'learning_hub',
        'research_published', 'episode_published', 'signal_published' // Legacy types
      ] 
    }
  }

  // Get notifications
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: [
      { readAt: 'asc' }, // Unread first
      { createdAt: 'desc' }
    ],
    take: limit + 1, // Take one extra to check if there are more
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  })

  const hasNextPage = notifications.length > limit
  const items = hasNextPage ? notifications.slice(0, -1) : notifications
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

  // Get unread count for all filters
  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, channel: 'inapp', readAt: null }
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // New types
      case 'portfolio_update':
        return '📊'
      case 'crypto_compass':
        return '🎥'
      case 'learning_hub':
        return '📚'
      case 'community_mention':
        return '@'
      case 'community_reply':
        return '💬'
      case 'announcement':
        return '📢'
      // Legacy types (for backward compatibility)
      case 'research_published':
        return '📚'
      case 'episode_published':
        return '🎥'
      case 'signal_published':
        return '📊'
      case 'mention':
        return '@'
      case 'reply':
        return '💬'
      default:
        return '🔔'
    }
  }

  return (
    <div className="container-main section-padding">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-hero text-4xl mb-2">Notifications</h1>
            <p className="subhead">Stay updated with the latest content and community activity</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <NotificationFilters currentFilter={filter} />
      </div>

      {/* Notifications List */}
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((notification) => (
            <Card key={notification.id} className={`transition-colors ${
              !notification.readAt ? 'bg-blue-50/50 border-blue-200' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {notification.url ? (
                          <Link
                            href={notification.url}
                            className="block group"
                          >
                            <h3 className="heading-2 text-lg group-hover:text-gold-600 transition-colors">
                              {notification.title}
                            </h3>
                          </Link>
                        ) : (
                          <h3 className="heading-2 text-lg">
                            {notification.title}
                          </h3>
                        )}
                        
                        {notification.body && (
                          <p className="subhead mt-2">
                            {notification.body}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {formatDate(notification.createdAt, 'MMM d, yyyy h:mm a')}
                          </span>
                          {!notification.readAt && (
                            <Badge variant="destructive" className="text-xs">
                              Unread
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {hasNextPage && (
            <div className="text-center pt-6">
              <Button variant="outline" asChild>
                <Link href={`/notifications?filter=${filter}&cursor=${nextCursor}`}>
                  Load more notifications
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="w-16 h-16 text-slate-400 mx-auto mb-4" />}
          title="No notifications yet"
          description={
            filter === 'unread' 
              ? "You're all caught up! No unread notifications."
              : filter === 'mentions'
              ? "No mentions yet. Get involved in community discussions!"
              : filter === 'content'
              ? "No content notifications yet. New research and episodes will appear here."
              : "No notifications yet. You'll see updates here when new content is published or you're mentioned."
          }
          action={
            filter !== 'all' ? {
              label: "View all notifications",
              href: "/notifications"
            } : {
              label: "Browse Research",
              href: "/research"
            }
          }
        />
      )}
    </div>
  )
}
