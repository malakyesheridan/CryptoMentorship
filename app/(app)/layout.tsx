import type { ReactNode } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppSectionLayout({ children }: AppLayoutProps) {
  return <AppLayout>{children}</AppLayout>
}