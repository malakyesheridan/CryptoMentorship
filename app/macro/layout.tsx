import { ReactNode } from 'react'

interface MacroLayoutProps {
  children: ReactNode
}

export default function MacroLayout({ children }: MacroLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
