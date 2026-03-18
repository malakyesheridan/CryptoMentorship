'use client'

import { useState } from 'react'

export default function ToolsPage() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {/* Iframe Container */}
      <div className="flex-1 relative px-4 pb-4">
        {isLoading && (
          <div className="absolute inset-4 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl flex items-center justify-center z-10">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 border-2 border-[var(--gold-400)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[var(--text-muted)] text-sm">Loading analytics tools...</p>
            </div>
          </div>
        )}
        <iframe
          src="https://stewart-and-co.onrender.com"
          title="Analytics Tools"
          className="w-full h-full min-h-[calc(100vh-32px)] rounded-2xl border border-[var(--border-subtle)]"
          style={{ backgroundColor: 'var(--bg-panel)' }}
          onLoad={() => setIsLoading(false)}
          allow="fullscreen"
        />
      </div>
    </div>
  )
}
