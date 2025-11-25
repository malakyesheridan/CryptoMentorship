'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BeamsBackground } from '@/components/auth/BeamsBackground'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email')
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
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
              Reset Password
            </h1>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              Enter your email to receive a reset link
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem',
                color: '#10b981'
              }}>
                ✓
              </div>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                If an account exists with this email, a password reset link has been sent.
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
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500',
                  color: '#1e293b',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                disabled={isLoading || !email}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: (isLoading || !email) ? '#94a3b8' : '#d4af37',
                  color: 'white',
                  cursor: (isLoading || !email) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
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
          )}
          </div>
        </div>
      </div>
    </BeamsBackground>
  )
}

