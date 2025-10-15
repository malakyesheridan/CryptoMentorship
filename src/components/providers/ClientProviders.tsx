'use client'

import { SessionProvider } from './SessionProvider'

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}
