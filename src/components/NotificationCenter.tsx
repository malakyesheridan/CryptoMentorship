"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useMediaQuery } from './useMediaQuery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'

export type NotificationCenterItem = {
  id: string
  title: string
  body?: string
  href?: string
  createdAt: string
  readAt?: string | null
  severity?: 'info' | 'success' | 'warning' | 'error'
}

type Props = {
  fetchNotifications: () => Promise<NotificationCenterItem[]>
  markRead: (ids: string[]) => Promise<void>
  markAllRead?: () => Promise<void>
  clearNotification?: (id: string) => Promise<void>
  onNavigate?: (href: string) => void
  mobileBreakpointPx?: number
  badgeCount?: number
  headerActions?: React.ReactNode
}

export function NotificationCenter({
  fetchNotifications,
  markRead,
  markAllRead,
  clearNotification,
  onNavigate,
  mobileBreakpointPx = 768,
  badgeCount,
  headerActions
}: Props) {
  const router = useRouter()
  const isMobile = useMediaQuery(`(max-width: ${mobileBreakpointPx - 1}px)`)

  const bellRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationCenterItem[]>([])

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.readAt ? 0 : 1), 0),
    [items]
  )

  const effectiveBadgeCount = badgeCount ?? unreadCount

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNotifications()
      setItems(data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [fetchNotifications])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const navigate = useCallback(
    (href: string) => {
      if (onNavigate) onNavigate(href)
      else router.push(href)
      setOpen(false)
    },
    [onNavigate, router]
  )

  const onBellClick = () => setOpen((value) => !value)

  const onBackdropPointerDown = (event: React.PointerEvent) => {
    event.preventDefault()
    setOpen(false)
  }

  const stop = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation()
  }

  const markOneRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n))
    )
    try {
      await markRead([id])
    } catch {
      void load()
    }
  }

  const onItemClick = async (notification: NotificationCenterItem) => {
    await markOneRead(notification.id)
    if (notification.href) navigate(notification.href)
    else setOpen(false)
  }

  const onMarkAll = async () => {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })))
    try {
      if (markAllRead) await markAllRead()
      else await markRead(items.filter((n) => !n.readAt).map((n) => n.id))
    } catch {
      void load()
    }
  }

  const onClear = async (id: string) => {
    if (!clearNotification) return
    const prev = items
    setItems((cur) => cur.filter((n) => n.id !== id))
    try {
      await clearNotification(id)
    } catch {
      setItems(prev)
    }
  }

  return (
    <>
      <button
        ref={bellRef}
        onClick={onBellClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100 transition-colors"
      >
        <span className="sr-only">Notifications</span>
        <Bell className="h-5 w-5 text-slate-700" />
        {effectiveBadgeCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full px-1 text-xs leading-5 text-white bg-gold-500 text-center">
            {effectiveBadgeCount > 99 ? '99+' : effectiveBadgeCount}
          </span>
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[1000]" onPointerDown={onBackdropPointerDown}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            <div
              ref={panelRef}
              onPointerDown={stop}
              className={
                isMobile
                  ? 'absolute left-0 right-0 bottom-0 mx-auto w-full max-w-none rounded-t-2xl bg-white border border-slate-200 shadow-2xl'
                  : 'absolute right-4 top-16 w-[420px] rounded-2xl bg-white border border-slate-200 shadow-2xl'
              }
              style={isMobile ? { maxHeight: '90dvh' } : { maxHeight: '70vh' }}
              role="dialog"
              aria-modal="true"
            >
              <Header
                loading={loading}
                unreadCount={unreadCount}
                onMarkAll={onMarkAll}
                onClose={() => setOpen(false)}
                headerActions={headerActions}
              />

              <div
                className="overflow-y-auto"
                style={{ maxHeight: isMobile ? 'calc(90dvh - 64px)' : 'calc(70vh - 64px)' }}
              >
                <Body
                  items={items}
                  loading={loading}
                  error={error}
                  onRetry={load}
                  onItemClick={onItemClick}
                  onClear={clearNotification ? onClear : undefined}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

function Header({
  unreadCount,
  loading,
  onMarkAll,
  onClose,
  headerActions
}: {
  unreadCount: number
  loading: boolean
  onMarkAll: () => void
  onClose: () => void
  headerActions?: React.ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
      <div className="flex flex-col">
        <div className="text-sm font-semibold text-slate-900">Notifications</div>
        <div className="text-xs text-slate-500">
          {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {headerActions}
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={onMarkAll}
          className="text-xs"
        >
          <CheckCheck className="h-3 w-3 mr-1" />
          Mark all read
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function Body({
  items,
  loading,
  error,
  onRetry,
  onItemClick,
  onClear
}: {
  items: NotificationCenterItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onItemClick: (n: NotificationCenterItem) => void
  onClear?: (id: string) => void
}) {
  if (error) {
    return (
      <div className="p-6 text-sm text-slate-600">
        <div className="mb-3">{error}</div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  if (loading && items.length === 0) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>
  }

  if (!loading && items.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No notifications.</div>
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((notification) => {
        const unread = !notification.readAt
        return (
          <div
            key={notification.id}
            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
            onClick={() => onItemClick(notification)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {unread && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                  <div className={`text-sm ${unread ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                    {notification.title}
                  </div>
                </div>
                {notification.body && (
                  <div className="mt-1 text-xs text-slate-500 line-clamp-2">{notification.body}</div>
                )}
                <div className="mt-2 text-[11px] text-slate-400">
                  {formatDate(notification.createdAt, 'MMM d, yyyy h:mm a')}
                </div>
              </div>

              {onClear && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    onClear(notification.id)
                  }}
                  className="text-xs"
                >
                  Dismiss
                </Button>
              )}

              {unread && !onClear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    onItemClick(notification)
                  }}
                  className="text-slate-600 hover:text-slate-800"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
