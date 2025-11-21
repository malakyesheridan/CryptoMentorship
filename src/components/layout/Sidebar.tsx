'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Play, 
  TrendingUp, 
  MessageSquare, 
  User,
  GraduationCap,
  Shield
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Crypto Compass', href: '/crypto-compass', icon: Play },
  { name: 'My Portfolio', href: '/portfolio', icon: TrendingUp },
  { name: 'Learning Hub', href: '/learning', icon: GraduationCap },
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Account', href: '/account', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Check if user has admin or editor role
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'editor'
  
  // Add admin link if user is admin/editor
  const allNavigation = isAdmin 
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
