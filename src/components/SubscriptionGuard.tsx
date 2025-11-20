'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'

interface SubscriptionGuardProps {
  children: React.ReactNode
  userRole?: string
}

/**
 * Client-side subscription guard
 * Checks subscription status without blocking page render
 * Uses cached API endpoint for fast response
 */
export function SubscriptionGuard({ children, userRole }: SubscriptionGuardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Check subscription status using cached API endpoint
  // Hooks must be called before any conditional returns
  const { data, error } = useSWR(
    session?.user?.id ? '/api/me/subscription-status' : null,
    (url) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute - matches API cache
      fallbackData: { hasActiveSubscription: true }, // Optimistic - allow render first
    }
  )
  
  useEffect(() => {
    // Only redirect if we have a definitive "no subscription" response
    if (data && !data.hasActiveSubscription && !error) {
      router.push('/subscribe?required=true')
    }
  }, [data, error, router])
  
  // Admins bypass subscription requirements
  if (userRole === 'admin' || session?.user?.role === 'admin') {
    return <>{children}</>
  }
  
  // Show children while checking (optimistic rendering)
  return <>{children}</>
}

