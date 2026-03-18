import { ReactNode } from 'react'

interface CryptoCompassLayoutProps {
  children: ReactNode
}

export default function CryptoCompassLayout({ children }: CryptoCompassLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {children}
    </div>
  )
}
