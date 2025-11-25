import type { ReactNode } from 'react'
import './globals.css'
import { ClientProviders } from '@/components/providers/ClientProviders'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Stewart & Co Portal',
  description: 'Education, signals, and resources for crypto investors',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`min-h-screen bg-slate-50 text-slate-900 ${inter.className}`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
