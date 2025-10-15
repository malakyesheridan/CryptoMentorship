import type { ReactNode } from 'react'
import './globals.css'
import { ClientProviders } from '@/components/providers/ClientProviders'

export const metadata = {
  title: 'Crypto Mentorship Portal',
  description: 'Education, signals, and resources for crypto investors',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
