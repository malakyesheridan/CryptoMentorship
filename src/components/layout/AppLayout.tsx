'use client'

import { Suspense } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

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
  return (
    <div className="min-h-screen bg-ivory">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
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
