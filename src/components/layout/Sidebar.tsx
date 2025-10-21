'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  Play, 
  TrendingUp, 
  BookOpen, 
  MessageSquare, 
  User,
  GraduationCap,
  Calendar
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Research', href: '/research', icon: FileText },
  { name: 'Crypto Compass', href: '/macro', icon: Play },
  { name: 'Signals', href: '/signals', icon: TrendingUp },
  { name: 'Resources', href: '/resources', icon: BookOpen },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'My Learning', href: '/learning', icon: GraduationCap },
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Account', href: '/account', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-white/90 backdrop-blur border-r border-[color:var(--border-subtle)] h-full">
      <div className="p-6 border-b border-[color:var(--border-subtle)]">
        <span className="logo-type text-[15px] md:text-[16px] text-slate-800">
          STEWART & CO
        </span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
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
