'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Application Error
            </h1>
            <p className="text-slate-600 mb-6">
              A server-side exception has occurred. Please try refreshing the page.
            </p>
            {error.digest && (
              <p className="text-sm text-slate-500 mb-4">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
