'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { Menu, X } from 'lucide-react'

interface TopbarProps {
  onMenuClick?: () => void
  isMenuOpen?: boolean
}

export function Topbar({ onMenuClick, isMenuOpen }: TopbarProps) {
  const { data: session } = useSession()

  const handleSignOut = async () => {
    // Sign out without redirect (NextAuth will use NEXTAUTH_URL which might be wrong port)
    await signOut({ redirect: false })
    // Manually redirect to login page using current origin (same port)
    window.location.href = '/login'
  }

  return (
    <div className="bg-white/90 backdrop-blur border-b border-[color:var(--border-subtle)] relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-slate-700" />
            ) : (
              <Menu className="h-6 w-6 text-slate-700" />
            )}
          </button>
          
          <div className="flex-1 md:flex-none">
            {/* Ticker removed */}
          </div>
          
          <div className="ml-4 flex items-center gap-2">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger 
                data-testid="user-menu"
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="bg-gold-500 text-white text-sm">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session?.user?.role || 'guest'}
                  </p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <a href="/account">Account Settings</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
