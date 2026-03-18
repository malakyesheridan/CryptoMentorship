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
    <div className="relative z-50" style={{ backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-[#1a1815] transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-[var(--text-strong)]" />
            ) : (
              <Menu className="h-6 w-6 text-[var(--text-strong)]" />
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
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-[#1a1815] transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="bg-[var(--gold-400)] text-white text-sm">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-[var(--text-strong)]">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
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
