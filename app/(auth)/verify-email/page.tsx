'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleVerification = useCallback(async (verificationToken: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to verify email')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login?verified=true')
      }, 2000)
    } catch (err) {
      console.error('Verification error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      handleVerification(tokenParam)
    } else {
      setError('Invalid verification link. No token provided.')
    }
  }, [searchParams, handleVerification])

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
              Email Verified!
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Your email has been verified successfully. Redirecting to login...
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
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {isLoading ? (
            <>
              <div style={{ 
                fontSize: '2rem', 
                marginBottom: '1rem',
                animation: 'spin 1s linear infinite'
              }}>
                ⏳
              </div>
              <p style={{ color: '#64748b' }}>Verifying your email...</p>
            </>
          ) : error ? (
            <>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem',
                color: '#dc2626'
              }}>
                ✗
              </div>
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem',
                color: '#1e293b'
              }}>
                Verification Failed
              </h1>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                {error}
              </p>
              <Link 
                href="/login" 
                style={{ 
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#d4af37',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                }}
              >
                Back to Login
              </Link>
            </>
          ) : (
            <p style={{ color: '#64748b' }}>Loading...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  )
}

