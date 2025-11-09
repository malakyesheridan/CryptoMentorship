'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError('Invalid reset link. No token provided.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!token) {
      setError('Invalid reset token')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reset password')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 2000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  if (!token && !error) {
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
            <p style={{ color: '#64748b' }}>Loading...</p>
          </div>
        </div>
      </div>
    )
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
              Password Reset!
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Your password has been reset successfully. Redirecting to login...
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
              Reset Password
            </h1>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              Enter your new password
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
                New Password *
              </label>
              <input
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <PasswordStrengthMeter password={password} />
                </div>
              )}
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Confirm Password *
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {confirmPassword && password !== confirmPassword && (
                <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                  Passwords do not match
                </p>
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
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              style={{
                width: '100%',
                height: '3rem',
                fontSize: '1.125rem',
                fontWeight: '500',
                borderRadius: '0.5rem',
                border: 'none',
                background: (isLoading || !password || !confirmPassword || password !== confirmPassword) ? '#94a3b8' : '#d4af37',
                color: 'white',
                cursor: (isLoading || !password || !confirmPassword || password !== confirmPassword) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <p style={{ 
              fontSize: '0.875rem', 
              color: '#64748b', 
              textAlign: 'center',
              marginTop: '0.5rem'
            }}>
              Remember your password?{' '}
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

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  )
}

