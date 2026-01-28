'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  DollarSign
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'ROI Dashboard', href: '/admin/roi', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Affiliates', href: '/admin/affiliates', icon: Users },
  { name: 'Payouts', href: '/admin/affiliates/payouts', icon: DollarSign },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white/90 backdrop-blur border-r border-[color:var(--border-subtle)] shadow-lg">
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
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-white'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
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
            className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
