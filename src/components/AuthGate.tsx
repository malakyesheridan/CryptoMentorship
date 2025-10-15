'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGateProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGate({ children, requireAuth = true }: AuthGateProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, requireAuth, router])

  if (requireAuth && status === 'loading') {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !session) {
    return null
  }

  return <>{children}</>
}
