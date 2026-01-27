import { redirect } from 'next/navigation'
import { requireActiveSubscription } from './access'

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
  return requireActiveSubscription('page')
}

