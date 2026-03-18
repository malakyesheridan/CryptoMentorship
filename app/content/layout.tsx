import { ReactNode } from 'react'

interface ContentLayoutProps {
  children: ReactNode
}

export default function ContentLayout({ children }: ContentLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {children}
    </div>
  )
}
