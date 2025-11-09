import type { ReactNode } from 'react'

interface SubscribeLayoutProps {
  children: ReactNode
}

export default function SubscribeLayout({ children }: SubscribeLayoutProps) {
  return <>{children}</>
}

