'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/dates'
import { toast } from 'sonner'
import Link from 'next/link'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { CreateNotificationModal } from '@/components/admin/CreateNotificationModal'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  url?: string
  readAt?: string
  createdAt: string
}

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()
  
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'

  // Fetch unread count - refresh every 30 seconds (matches API cache)
  // Use keepPreviousData to prevent UI flicker during navigation
  const { data: unreadData, mutate: mutateUnread } = useSWR(
    '/api/notifications/unread-count',
    (url) => fetch(url).then(res => res.json()),
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: false, // Don't refetch on reconnect (prevents blocking)
      dedupingInterval: 10000, // Increase dedupe to 10 seconds
      keepPreviousData: true, // Keep previous data during navigation
      fallbackData: { count: 0 }, // Fallback to prevent undefined
    }
  )

  // Fetch recent notifications
  const { data: notificationsData, mutate: mutateNotifications } = useSWR(
    isOpen ? '/api/notifications?limit=10' : null,
    (url) => fetch(url).then(res => res.json())
  )

  const unreadCount = unreadData?.count || 0
  const notifications = notificationsData?.notifications || []

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notificationId] })
      })
      
      mutateNotifications()
      mutateUnread()
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      
      mutateNotifications()
      mutateUnread()
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all notifications as read')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'research_published':
        return '📄'
      case 'episode_published':
        return '🎥'
      case 'signal_published':
        return '📊'
      case 'mention':
        return '@'
      case 'reply':
        return '💬'
      case 'announcement':
        return '📢'
      default:
        return '🔔'
    }
  }

  return (
    <div className={`relative z-[10000] ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden z-[9999] shadow-2xl">
          <CardContent className="p-0">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Notifications</h3>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false)
                        setIsCreateModalOpen(true)
                      }}
                      className="text-xs text-slate-600 hover:text-slate-800"
                      title="Create notification (Admin)"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-slate-600 hover:text-slate-800"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors ${
                        !notification.readAt ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {notification.url ? (
                            <Link
                              href={notification.url}
                              className="block"
                              onClick={() => setIsOpen(false)}
                            >
                              <h4 className="font-medium text-slate-800 hover:text-gold-600 transition-colors">
                                {notification.title}
                              </h4>
                            </Link>
                          ) : (
                            <h4 className="font-medium text-slate-800">
                              {notification.title}
                            </h4>
                          )}
                          
                          {notification.body && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">
                              {formatDate(notification.createdAt, 'MMM d, h:mm a')}
                            </span>
                            
                            {!notification.readAt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-slate-600 hover:text-slate-800 p-1 h-auto"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200">
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href="/notifications" onClick={() => setIsOpen(false)}>
                  View all notifications
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Create Notification Modal */}
      {isAdmin && (
        <CreateNotificationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            // Refresh notifications after creating
            mutateNotifications()
            mutateUnread()
          }}
        />
      )}
    </div>
  )
}
