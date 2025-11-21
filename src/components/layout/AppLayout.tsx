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
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-600">Loading...</p>
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
    <div className="min-h-screen bg-ivory">
      <div className="flex h-screen">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-white/95 backdrop-blur z-50 md:hidden shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex items-center justify-between p-6 border-b border-[color:var(--border-subtle)]">
                <span className="logo-type text-[15px] text-slate-800">
                  STEWART & CO
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-slate-700" />
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
