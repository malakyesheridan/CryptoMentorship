'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BeamsBackground } from '@/components/auth/BeamsBackground'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Get callback URL from window.location.search to avoid useSearchParams issues
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const callback = urlParams.get('callbackUrl')
      
      // Validate callback URL - must be a valid path and not the login page
      if (callback && callback.startsWith('/') && callback !== '/login' && !callback.startsWith('/login')) {
        setCallbackUrl(callback)
      } else {
        // Default to dashboard if callback is invalid or points to login
        setCallbackUrl('/dashboard')
      }
    }
  }, [])

  const handleMemberLogin = async () => {
    setIsLoading(true)
    setError(null)
    console.log('Attempting member login...')
    
    try {
      // Check if signIn function is available
      if (!signIn) {
        console.error('signIn function is not available')
        setError('Authentication system not available. Please refresh the page.')
        setIsLoading(false)
        return
      }
      
      const result = await signIn('demo', { 
        role: 'member',
        redirect: false
      })
      
      console.log('SignIn result:', result)
      
      if (result?.error) {
        console.error('SignIn error:', result.error)
        setError(`Login failed: ${result.error}`)
        setIsLoading(false)
      } else if (result?.ok) {
        console.log('Login successful, redirecting to dashboard...')
        // Use Next.js router for redirect
        router.push(callbackUrl)
      } else {
        console.log('SignIn returned unexpected result:', result)
        setError('Login failed: Unexpected response')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const handleAdminLogin = async () => {
    setIsLoading(true)
    setError(null)
    console.log('Attempting admin login...')
    
    try {
      // Check if signIn function is available
      if (!signIn) {
        console.error('signIn function is not available')
        setError('Authentication system not available. Please refresh the page.')
        setIsLoading(false)
        return
      }
      
      const result = await signIn('demo', { 
        role: 'admin',
        redirect: false
      })
      
      console.log('SignIn result:', result)
      
      if (result?.error) {
        console.error('SignIn error:', result.error)
        setError(`Login failed: ${result.error}`)
        setIsLoading(false)
      } else if (result?.ok) {
        console.log('Login successful, redirecting to dashboard...')
        // Use Next.js router for redirect
        router.push(callbackUrl)
      } else {
        console.log('SignIn returned unexpected result:', result)
        setError('Login failed: Unexpected response')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log('Starting login attempt...', { email, callbackUrl })
      
      // Validate callback URL before attempting login
      const finalCallbackUrl = callbackUrl && 
                               callbackUrl !== '/login' && 
                               !callbackUrl.startsWith('/login') &&
                               callbackUrl.startsWith('/')
        ? callbackUrl
        : '/dashboard'
      
      console.log('Final callback URL:', finalCallbackUrl)
      
      // Use redirect: false to check for errors first
      // Then manually redirect to ensure cookie is sent
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log('SignIn result:', result)

      // Check for errors
      if (result?.error) {
        console.error('Login error:', result.error)
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error)
        setIsLoading(false)
        return
      }

      // If no error, login succeeded
      // Verify session was created and check subscription
      console.log('Login successful, verifying session and subscription...')
      
      // Wait a moment for cookie to be set
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify session exists and check subscription
      try {
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store',
        })
        
        const session = await sessionRes.json()
        console.log('Session verification:', session)
        
        if (session?.user?.id) {
          // Admins bypass subscription requirements
          if (session.user.role === 'admin') {
            console.log('✅ Admin user, bypassing subscription check')
            window.location.href = finalCallbackUrl
            return
          }
          
          // Check if user has active subscription
          const subscriptionRes = await fetch('/api/me/subscription-status', {
            credentials: 'include',
            cache: 'no-store',
          })
          
          const subscriptionData = await subscriptionRes.json()
          console.log('Subscription status:', subscriptionData)
          
          if (!subscriptionData.hasActiveSubscription) {
            // User doesn't have subscription - redirect smoothly to subscribe page
            console.log('❌ No active subscription, redirecting to subscribe')
            setIsLoading(false)
            // Smooth redirect without alert popup
            window.location.href = '/subscribe?required=true'
            return
          }
          
          console.log('✅ Session verified, subscription active, redirecting to:', finalCallbackUrl)
          // Use window.location for hard redirect - ensures cookies are sent
          window.location.href = finalCallbackUrl
        } else {
          console.error('❌ Session not found after login')
          setError('Login succeeded but session could not be verified. Please try refreshing.')
          setIsLoading(false)
        }
      } catch (sessionErr) {
        console.error('Session verification failed:', sessionErr)
        // Try redirect anyway - cookie might be set
        window.location.href = finalCallbackUrl
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <BeamsBackground intensity="medium">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full relative z-20">
          <div className="bg-[#FFFDF7] rounded-2xl p-8 lg:p-10 text-center shadow-2xl border border-slate-200/50 backdrop-blur-sm">
            {/* Header */}
            <div className="mb-8 flex flex-col items-center">
              <img
                src="https://i.imgur.com/h7es4Rn.png"
                alt="STEWART & CO"
                className="mb-4 h-auto w-auto max-w-[200px]"
              />
              <p className="text-slate-600 text-base lg:text-lg">
                Premium cryptocurrency research and analysis
              </p>
            </div>

            {/* Content */}
            <div className="mb-6">
              {showPasswordLogin ? (
                <>
                  <div className="mb-6 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordLogin(false)
                        setEmail('')
                        setPassword('')
                        setError(null)
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors underline"
                    >
                      ← Back to options
                    </button>
                  </div>
                  <form onSubmit={handleCredentialsLogin} className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">
                      Sign In with Email
                    </h3>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 text-base rounded-lg border border-slate-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 outline-none transition-all bg-white/80"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 text-base rounded-lg border border-slate-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 outline-none transition-all bg-white/80"
                    />
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-gold-400 hover:bg-gold-500 text-slate-900 font-semibold h-12 rounded-lg transition-all"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowPasswordLogin(false)
                          setEmail('')
                          setPassword('')
                          setError(null)
                        }}
                        disabled={isLoading}
                        variant="outline"
                        className="px-6 h-12 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    </div>
                    <Link 
                      href="/forgot-password" 
                      className="block text-sm text-slate-500 hover:text-slate-700 transition-colors text-center"
                    >
                      Forgot password?
                    </Link>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <Link href="/register" className="block">
                      <Button
                        disabled={isLoading}
                        className="w-full bg-gold-400 hover:bg-gold-500 text-slate-900 font-semibold h-12 rounded-lg transition-all shadow-md hover:shadow-lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </Link>
                    
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-slate-300"></div>
                      <span className="text-sm text-slate-500">or</span>
                      <div className="flex-1 h-px bg-slate-300"></div>
                    </div>

                    <Button
                      onClick={() => setShowPasswordLogin(true)}
                      disabled={isLoading}
                      className="w-full bg-gold-400 hover:bg-gold-500 text-slate-900 font-semibold h-12 rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                      Sign in with Email & Password
                    </Button>
                  </div>
                </>
              )}
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BeamsBackground>
  )
}
