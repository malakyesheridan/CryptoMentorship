'use client'

import { Suspense, useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { X } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-[var(--gold-400)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [children])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="flex h-screen">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 z-50 md:hidden shadow-xl transform transition-transform duration-300 ease-in-out" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
              <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="logo-type text-[15px] text-[var(--text-strong)]">
                  STEWART & CO
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#1a1815] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-[var(--text-strong)]" />
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100vh-80px)]">
                <Sidebar />
              </div>
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar
            onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMenuOpen={isMobileMenuOpen}
          />
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<LoadingFallback />}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
