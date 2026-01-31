'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { BeamsBackground } from '@/components/auth/BeamsBackground'

function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isTrial, setIsTrial] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    referralCode: '',
  })
  const [referralMeta, setReferralMeta] = useState({
    source: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      setFormData((prev) => ({ ...prev, referralCode: refCode }))
      const expiryDays = 30
      const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `referral_code=${refCode}; Path=/; Expires=${expires}; SameSite=Lax`
      document.cookie = `referral_clicked_at=${new Date().toISOString()}; Path=/; Expires=${expires}; SameSite=Lax`
    }
    const source = searchParams.get('source') || searchParams.get('utm_source') || ''
    setReferralMeta({
      source,
      utmSource: searchParams.get('utm_source') || '',
      utmMedium: searchParams.get('utm_medium') || '',
      utmCampaign: searchParams.get('utm_campaign') || '',
      utmTerm: searchParams.get('utm_term') || '',
      utmContent: searchParams.get('utm_content') || '',
    })
    const trialParam = searchParams.get('trial')
    setIsTrial(trialParam === 'true' || trialParam === '1')
    const callback = searchParams.get('callbackUrl')
    if (callback && callback.startsWith('/') && !callback.startsWith('/login') && !callback.startsWith('/register')) {
      setCallbackUrl(callback)
    } else {
      setCallbackUrl('/dashboard')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Only send referralCode if it exists
      const registerData: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
      }
      if (formData.referralCode) {
        registerData.referralCode = formData.referralCode
      }
      if (referralMeta.source) {
        registerData.referralSource = referralMeta.source
      }
      if (referralMeta.utmSource) registerData.utmSource = referralMeta.utmSource
      if (referralMeta.utmMedium) registerData.utmMedium = referralMeta.utmMedium
      if (referralMeta.utmCampaign) registerData.utmCampaign = referralMeta.utmCampaign
      if (referralMeta.utmTerm) registerData.utmTerm = referralMeta.utmTerm
      if (referralMeta.utmContent) registerData.utmContent = referralMeta.utmContent
      if (isTrial) {
        registerData.trial = true
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      // Auto-login user after registration, then redirect to subscribe
      setTimeout(async () => {
        try {
          // Auto-sign in the user using NextAuth
          const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          })
          
          if (result?.ok) {
            // Wait a moment for session to be established
            await new Promise(resolve => setTimeout(resolve, 500))
            // Redirect to subscribe page smoothly
            window.location.href = isTrial ? callbackUrl : '/subscribe?newuser=true'
          } else {
            // If auto-login fails, redirect to login page
            router.push(isTrial ? '/login?registered=trial' : '/login?registered=true')
          }
        } catch (err) {
          console.error('Auto-login error:', err)
          // If auto-login fails, redirect to login page
          router.push(isTrial ? '/login?registered=trial' : '/login?registered=true')
        }
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <BeamsBackground intensity="medium">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full relative z-20">
            <div className="bg-[#FFFDF7] rounded-2xl p-8 text-center shadow-2xl border border-slate-200/50 backdrop-blur-sm">
              <div className="text-5xl mb-4 text-green-500">✓</div>
              <h1 className="text-2xl font-bold mb-2 text-slate-900">
                {isTrial ? 'Trial Activated!' : 'Account Created!'}
              </h1>
              <p className="text-slate-600 mb-6">
                {isTrial
                  ? 'Your free trial is active. Redirecting to your dashboard...'
                  : 'Your account has been created successfully. Redirecting to choose your subscription...'}
              </p>
            </div>
          </div>
        </div>
      </BeamsBackground>
    )
  }

  return (
    <BeamsBackground intensity="medium">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full relative z-20">
          <div className="bg-[#FFFDF7] rounded-2xl p-8 shadow-2xl border border-slate-200/50 backdrop-blur-sm">
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#1e293b'
            }}>
              {isTrial ? 'Start Free Trial' : 'Create Account'}
            </h1>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              {isTrial ? 'Begin your trial with ' : 'Join '}
              <span style={{ color: '#d4af37' }}>STEWART & CO</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Name *
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Email *
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Password *
              </label>
              <input
                type="password"
                placeholder="Minimum 12 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                minLength={12}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
              {formData.password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <PasswordStrengthMeter password={formData.password} />
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '0.5rem',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.email || !formData.password}
              style={{
                width: '100%',
                height: '3rem',
                fontSize: '1.125rem',
                fontWeight: '500',
                borderRadius: '0.5rem',
                border: 'none',
                background: (isLoading || !formData.email || !formData.password) ? '#94a3b8' : '#d4af37',
                color: 'white',
                cursor: (isLoading || !formData.email || !formData.password) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isLoading
                ? (isTrial ? 'Starting Trial...' : 'Creating Account...')
                : (isTrial ? 'Start Free Trial' : 'Create Account')}
            </button>

            <p style={{ 
              fontSize: '0.875rem', 
              color: '#64748b', 
              textAlign: 'center',
              marginTop: '0.5rem'
            }}>
              Already have an account?{' '}
              <Link 
                href="/login" 
                style={{ 
                  color: '#d4af37', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Sign in
              </Link>
            </p>
          </form>
          </div>
        </div>
      </div>
    </BeamsBackground>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <BeamsBackground intensity="medium">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full relative z-20">
            <div className="bg-[#FFFDF7] rounded-2xl p-8 text-center shadow-2xl border border-slate-200/50 backdrop-blur-sm">
              <p className="text-slate-600">Loading...</p>
            </div>
          </div>
        </div>
      </BeamsBackground>
    }>
      <RegisterForm />
    </Suspense>
  )
}

