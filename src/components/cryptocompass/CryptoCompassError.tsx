'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

interface CryptoCompassErrorProps {
  errorMessage?: string
}

export function CryptoCompassError({ errorMessage }: CryptoCompassErrorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-page)] via-[var(--bg-panel)] to-[var(--bg-hover)] flex items-center justify-center px-4">
      <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg border border-[var(--border-subtle)] p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#2e1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-[#c03030]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-strong)] mb-2">Error Loading Crypto Compass Page</h1>
        <p className="text-[var(--text-strong)] mb-1">Something went wrong while loading the page.</p>
        {errorMessage && (
          <p className="text-sm text-[var(--text-muted)] mb-6 font-mono bg-[var(--bg-hover)] p-2 rounded">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gold-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gold-600 transition-colors"
          >
            Try Again
          </button>
          <Link 
            href="/dashboard"
            className="bg-[var(--bg-skeleton)] text-[var(--text-strong)] px-6 py-2 rounded-lg font-medium hover:bg-[var(--bg-skeleton)] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

