import { ReactNode } from 'react'

interface ContentLayoutProps {
  children: ReactNode
}

export default function ContentLayout({ children }: ContentLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
