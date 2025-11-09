'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

interface CryptoCompassErrorProps {
  errorMessage?: string
}

export function CryptoCompassError({ errorMessage }: CryptoCompassErrorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Crypto Compass Page</h1>
        <p className="text-slate-600 mb-1">Something went wrong while loading the page.</p>
        {errorMessage && (
          <p className="text-sm text-slate-500 mb-6 font-mono bg-slate-50 p-2 rounded">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
          >
            Try Again
          </button>
          <Link 
            href="/dashboard"
            className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

