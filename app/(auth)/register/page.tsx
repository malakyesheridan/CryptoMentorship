'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'

function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    referralCode: '',
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      setFormData((prev) => ({ ...prev, referralCode: refCode }))
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
            window.location.href = '/subscribe?newuser=true'
          } else {
            // If auto-login fails, redirect to login page
            router.push('/login?registered=true')
          }
        } catch (err) {
          console.error('Auto-login error:', err)
          // If auto-login fails, redirect to login page
          router.push('/login?registered=true')
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
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              color: '#10b981'
            }}>
              ✓
            </div>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#1e293b'
            }}>
              Account Created!
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Your account has been created successfully. Redirecting to choose your subscription...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '28rem', width: '100%' }}>
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#1e293b'
            }}>
              Create Account
            </h1>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              Join <span style={{ color: '#d4af37' }}>STEWART & CO</span>
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
                Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              disabled={isLoading || !formData.email || !formData.password}
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
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
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <p style={{ color: '#64748b' }}>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}

