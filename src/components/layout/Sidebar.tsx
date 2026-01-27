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
  const [accountOpen, setAccountOpen] = useState(false)
  
  // Check if user has admin or editor role
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'
  const isAccountActive = pathname === '/account' || pathname?.startsWith('/account/')
  const isAccountOpen = isAccountActive || accountOpen

  useEffect(() => {
    if (isAccountActive) {
      setAccountOpen(true)
    }
  }, [isAccountActive])
  
  // Add admin link if user is admin/editor
  const allNavigation: NavigationItem[] = isAdmin 
    ? [...navigation, { name: 'Admin', href: '/admin', icon: Shield }]
    : navigation

  return (
    <div className="flex flex-col w-full md:w-64 bg-transparent md:bg-white/90 backdrop-blur border-r-0 md:border-r border-[color:var(--border-subtle)] h-full">
      <div className="hidden md:block p-6 border-b border-[color:var(--border-subtle)]">
        <span className="logo-type text-[15px] md:text-[16px] text-slate-800">
          STEWART & CO
        </span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {allNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href === '/admin' && pathname?.startsWith('/admin'))
          const hasChildren = Boolean(item.children?.length)
          const isAccount = item.href === '/account'

          if (hasChildren && isAccount) {
            return (
              <div key={item.name} className="group relative">
                <div className="flex items-center gap-2">
                  <Link
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      'flex flex-1 items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isAccountActive
                        ? 'bg-gold-500 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                  <button
                    type="button"
                    aria-label="Toggle account submenu"
                    className={cn(
                      'md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors',
                      isAccountOpen && 'text-slate-900'
                    )}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setAccountOpen((prev) => !prev)
                    }}
                  >
                    <ChevronRight className={cn('h-4 w-4 transition-transform', isAccountOpen && 'rotate-90')} />
                  </button>
                </div>

                {/* Inline submenu */}
                <div className={cn('mt-2 ml-10 space-y-1', isAccountOpen ? 'block' : 'hidden')}>
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
                            ? 'bg-gold-100 text-slate-900'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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
                  ? 'bg-gold-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
