'use client'

interface FeedLayoutProps {
  children: React.ReactNode
}

export function FeedLayout({ children }: FeedLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {children}
    </div>
  )
}
