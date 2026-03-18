'use client'

interface FeedLayoutProps {
  children: React.ReactNode
}

export function FeedLayout({ children }: FeedLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {children}
    </div>
  )
}
