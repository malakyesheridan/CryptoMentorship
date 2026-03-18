'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Play,
  TrendingUp,
  Wrench,
  MessageSquare,
  User,
  GraduationCap,
  Shield,
  ChevronRight
} from 'lucide-react'

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: Array<{ name: string; href: string }>
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Crypto Compass', href: '/crypto-compass', icon: Play },
  { name: 'My Portfolio', href: '/portfolio', icon: TrendingUp },
  { name: 'Tools', href: '/tools', icon: Wrench },
  { name: 'Learning Hub', href: '/learning', icon: GraduationCap },
  { name: 'Community', href: '/community', icon: MessageSquare },
  {
    name: 'Account',
    href: '/account',
    icon: User,
    children: [
      { name: 'Subscription', href: '/account/subscription' },
      { name: 'Referrals', href: '/account/referrals' }
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  // Check if user has admin or editor role
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'

  // Track which parent items should be open (auto-open when child is active)
  useEffect(() => {
    const isAccountActive = pathname === '/account' || pathname?.startsWith('/account/')
    const isAdminActive = pathname === '/admin' || pathname?.startsWith('/admin/')
    setOpenMenus((prev) => ({
      ...prev,
      ...(isAccountActive && { Account: true }),
      ...(isAdminActive && { Admin: true }),
    }))
  }, [pathname])

  // Add admin link if user is admin/editor
  const allNavigation: NavigationItem[] = isAdmin
    ? [...navigation, {
        name: 'Admin',
        href: '/admin',
        icon: Shield,
        children: [
          { name: 'Community', href: '/admin/community' },
          { name: 'Strategies', href: '/admin/strategies' },
        ]
      }]
    : navigation

  return (
    <div className="flex flex-col w-full md:w-64 h-full" style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-subtle)' }}>
      <div className="hidden md:block p-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="logo-type text-[15px] md:text-[16px]" style={{ color: 'var(--text-strong)' }}>
          STEWART & CO
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {allNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href === '/admin' && pathname?.startsWith('/admin'))
          const hasChildren = Boolean(item.children?.length)

          if (hasChildren) {
            const isParentActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const isMenuOpen = openMenus[item.name] || isParentActive

            return (
              <div key={item.name} className="group relative">
                <div className="flex items-center gap-2">
                  <Link
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      'flex flex-1 items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isParentActive
                        ? 'bg-[var(--gold-400)] text-white shadow-lg'
                        : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Toggle ${item.name} submenu`}
                    className={cn(
                      'md:hidden p-2 rounded-lg transition-colors',
                      isMenuOpen ? 'text-[var(--text-strong)]' : 'text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[#1a1815]'
                    )}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setOpenMenus((prev) => ({ ...prev, [item.name]: !prev[item.name] }))
                    }}
                  >
                    <ChevronRight className={cn('h-4 w-4 transition-transform', isMenuOpen && 'rotate-90')} />
                  </button>
                </div>

                {/* Inline submenu */}
                <div className={cn('mt-2 ml-10 space-y-1', isMenuOpen ? 'block' : 'hidden')}>
                  {item.children?.map((child) => {
                    const isChildActive = pathname === child.href
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        prefetch={true}
                        className={cn(
                          'flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          isChildActive
                            ? 'bg-[#2a2418] text-[var(--gold-400)]'
                            : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
                        )}
                      >
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--gold-400)] text-white shadow-lg'
                  : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
