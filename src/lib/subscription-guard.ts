import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { hasActiveSubscription } from './access'

/**
 * Server-side subscription guard
 * Use this in page components to redirect users without active subscriptions
 * 
 * @example
 * ```tsx
 * export default async function MyPage() {
 *   await requireSubscription()
 *   // ... rest of page
 * }
 * ```
 */
export async function requireSubscription() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }
  
  const hasSubscription = await hasActiveSubscription(session.user.id)
  
  if (!hasSubscription) {
    redirect('/subscribe?required=true')
  }
  
  return session.user
}

