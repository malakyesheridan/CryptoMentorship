'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  Shield,
  BookOpen,
  ArrowLeft,
  ChevronDown,
  FileText,
  Video,
  Calendar,
  Megaphone,
  TrendingUp,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

interface NavChild {
  name: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  icon: LucideIcon
  children: NavChild[]
}

interface NavLink {
  name: string
  href: string
  icon: LucideIcon
}

type NavItem = NavLink | NavGroup

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    label: 'Content',
    icon: FileText,
    children: [
      { name: 'Episodes', href: '/admin/episodes', icon: Video },
      { name: 'Events', href: '/admin/events', icon: Calendar },
      { name: 'Research', href: '/admin/content/new', icon: FileText },
      { name: 'Announcements', href: '/admin/announce', icon: Megaphone },
    ],
  },
  { name: 'Learning', href: '/admin/learn/tracks', icon: BookOpen },
  {
    label: 'Signals & Strategies',
    icon: TrendingUp,
    children: [
      { name: 'Daily Signals', href: '/admin/signals', icon: BarChart3 },
      { name: 'Strategies', href: '/admin/strategies', icon: TrendingUp },
    ],
  },
  { name: 'Users', href: '/admin/users', icon: Users },
  {
    label: 'Affiliates & Payouts',
    icon: DollarSign,
    children: [
      { name: 'Affiliates', href: '/admin/affiliates', icon: Users },
      { name: 'Payouts', href: '/admin/affiliates/payouts', icon: DollarSign },
    ],
  },
  { name: 'Risk Profiles', href: '/admin/risk-profiles', icon: Shield },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

const STORAGE_KEY = 'admin-sidebar-expanded'

function getAllHrefs(): string[] {
  const hrefs: string[] = []
  for (const item of navigation) {
    if (isGroup(item)) {
      for (const child of item.children) hrefs.push(child.href)
    } else {
      hrefs.push(item.href)
    }
  }
  return hrefs
}

export function AdminSidebar() {
  const pathname = usePathname()

  // Find the active href from all nav items
  const activeHref = useMemo(() => {
    if (!pathname) return ''
    const allHrefs = getAllHrefs()
    const match = allHrefs
      .filter(
        (href) =>
          pathname === href ||
          (href !== '/admin' && pathname.startsWith(`${href}/`))
      )
      .sort((a, b) => b.length - a.length)[0]
    return match ?? ''
  }, [pathname])

  // Find which groups should be auto-expanded (contain active route)
  const autoExpandedGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const item of navigation) {
      if (isGroup(item)) {
        for (const child of item.children) {
          if (
            activeHref === child.href ||
            (child.href !== '/admin' && activeHref.startsWith(`${child.href}/`))
          ) {
            groups.add(item.label)
          }
        }
      }
    }
    return groups
  }, [activeHref])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount, merge with auto-expanded
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const arr: string[] = stored ? JSON.parse(stored) : []
      const merged = new Set<string>(arr)
      // Merge stored state with auto-expanded groups
      Array.from(autoExpandedGroups).forEach((g) => merged.add(g))
      setExpanded(merged)
    } catch {
      setExpanded(autoExpandedGroups)
    }
    setHydrated(true)
  }, [autoExpandedGroups])

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expanded)))
    } catch {}
  }, [expanded, hydrated])

  const toggleGroup = useCallback((label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[var(--bg-panel)] backdrop-blur border-r border-[color:var(--border-subtle)] shadow-lg z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-[color:var(--border-subtle)]">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-playfair font-bold text-lg">Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            if (isGroup(item)) {
              const isExpanded = expanded.has(item.label)
              const hasActiveChild = item.children.some(
                (c) =>
                  activeHref === c.href ||
                  (c.href !== '/admin' && activeHref.startsWith(`${c.href}/`))
              )

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      hasActiveChild
                        ? 'text-gold-400'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815]'
                    )}
                  >
                    <span className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-200 ease-in-out',
                      isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border-subtle)] pl-3">
                        {item.children.map((child) => {
                          const isActive = activeHref === child.href
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'flex items-center space-x-3 px-3 py-1.5 rounded-lg text-sm transition-colors',
                                isActive
                                  ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-white font-medium'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815]'
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.name}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // Direct link (no children)
            const isActive = activeHref === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-white'
                    : 'text-[var(--text-strong)] hover:text-[var(--text-strong)] hover:bg-[#1a1815]'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--border-subtle)]">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
