import { ReactNode } from 'react'

interface CryptoCompassLayoutProps {
  children: ReactNode
}

export default function CryptoCompassLayout({ children }: CryptoCompassLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
