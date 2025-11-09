'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

/**
 * Client-side subscription gate component
 * Redirects users without active subscriptions to subscribe page
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkSubscription() {
      if (status === 'loading') return
      
      if (!session?.user) {
        router.push('/login')
        return
      }

      // Admins bypass subscription requirements
      if (session.user.role === 'admin') {
        setHasAccess(true)
        setChecking(false)
        return
      }

      try {
        const res = await fetch('/api/me/subscription-status')
        const data = await res.json()
        
        if (data.hasActiveSubscription) {
          setHasAccess(true)
        } else {
          // Redirect to subscribe page
          router.push('/subscribe?required=true')
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
        // On error, allow access (fail open for now)
        setHasAccess(true)
      } finally {
        setChecking(false)
      }
    }

    checkSubscription()
  }, [session, status, router])

  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Checking subscription...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}

