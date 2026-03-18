'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Check, X, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
  actionUrl?: string
}

interface NotificationListProps {
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onDelete?: (id: string) => void
}

export function NotificationList({ 
  notifications = [], 
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete 
}: NotificationListProps) {
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications)

  useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const handleMarkAsRead = (id: string) => {
    setLocalNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
    onMarkAsRead?.(id)
  }

  const handleMarkAllAsRead = () => {
    setLocalNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
    onMarkAllAsRead?.()
  }

  const handleDelete = (id: string) => {
    setLocalNotifications(prev => prev.filter(notif => notif.id !== id))
    onDelete?.(id)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-[#1a2e1a] text-[#4a7c3f] border-[#4a7c3f]/30'
      case 'warning': return 'bg-[#2a2418] text-[var(--gold-400)] border-[var(--gold-400)]/30'
      case 'error': return 'bg-[#2e1a1a] text-[#c03030] border-[#c03030]/30'
      default: return 'bg-[#1a1a2e] text-blue-400 border-blue-400/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✓'
      case 'warning': return '⚠'
      case 'error': return '✕'
      default: return 'ℹ'
    }
  }

  if (localNotifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bell className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-strong)] mb-2">No notifications</h3>
          <p className="text-[var(--text-strong)]">You&apos;re all caught up! Check back later for updates.</p>
        </CardContent>
      </Card>
    )
  }

  const unreadCount = localNotifications.filter(n => !n.read).length

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-[#1a1a2e] text-blue-400 border-blue-400/30">
              {unreadCount} unread
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {localNotifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`transition-all duration-200 hover:shadow-md ${
              !notification.read ? 'border-l-4 border-l-blue-500 bg-[#1a1a2e]/30' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <h4 className={`font-semibold ${!notification.read ? 'text-[var(--text-strong)]' : 'text-[var(--text-strong)]'}`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-[var(--text-strong)] text-sm mb-2">{notification.message}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notification.id)}
                    className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[#c03030]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
