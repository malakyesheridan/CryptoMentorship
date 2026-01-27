'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { CreateNotificationModal } from '@/components/admin/CreateNotificationModal'
import { NotificationCenter, type NotificationCenterItem } from '@/components/NotificationCenter'
import { Button } from '@/components/ui/button'

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'

  const { data: unreadData, mutate: mutateUnread } = useSWR(
    '/api/notifications/unread-count',
    (url) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000,
      keepPreviousData: true,
      fallbackData: { count: 0 }
    }
  )

  const unreadCount = unreadData?.count || 0

  const fetchNotifications = async (): Promise<NotificationCenterItem[]> => {
    const response = await fetch('/api/notifications?limit=50')
    if (!response.ok) {
      throw new Error('Failed to load notifications')
    }
    const data = await response.json()
    return (data?.notifications || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      href: item.url || undefined,
      createdAt: item.createdAt,
      readAt: item.readAt ?? null
    }))
  }

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    if (!response.ok) {
      throw new Error('Failed to mark notifications as read')
    }
    mutateUnread()
  }

  const markAllRead = async () => {
    const response = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    if (!response.ok) {
      throw new Error('Failed to mark notifications as read')
    }
    mutateUnread()
    toast.success('All notifications marked as read')
  }

  return (
    <div className={className}>
      <NotificationCenter
        fetchNotifications={fetchNotifications}
        markRead={markRead}
        markAllRead={markAllRead}
        badgeCount={unreadCount}
        headerActions={
          isAdmin ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
          ) : null
        }
      />

      {isAdmin && (
        <CreateNotificationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            mutateUnread()
          }}
        />
      )}
    </div>
  )
}
