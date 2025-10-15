'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const router = useRouter()

  useEffect(() => {
    // Get callback URL from window.location.search to avoid useSearchParams issues
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const callback = urlParams.get('callbackUrl')
      if (callback) {
        setCallbackUrl(callback)
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

  const testClick = () => {
    console.log('Button clicked!')
    setError('Button is working - this is a test message')
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
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '1rem',
              color: '#1e293b'
            }}>
              Welcome to <span style={{ color: '#d4af37' }}>STEWART & CO</span> - NEW VERSION
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
              Premium cryptocurrency research and analysis
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: '#1e293b'
            }}>
              Choose Your Access Level
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleMemberLogin}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  border: '2px solid #d4af37',
                  background: isLoading ? '#94a3b8' : '#d4af37',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Signing in...' : 'Member Access'}
              </button>
              
              <button
                onClick={handleAdminLogin}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  border: '2px solid #d4af37',
                  background: isLoading ? '#94a3b8' : '#d4af37',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Signing in...' : 'Admin Access'}
              </button>
            </div>
            
            {error && (
              <div style={{
                marginTop: '1rem',
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
            
            {/* Test button to verify click handlers work */}
            <button
              onClick={testClick}
              style={{
                width: '100%',
                height: '2rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                borderRadius: '0.25rem',
                border: '1px solid #64748b',
                background: '#64748b',
                color: 'white',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              Test Button (Click to verify functionality)
            </button>
            
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#94a3b8', 
              marginTop: '1rem' 
            }}>
              Choose your access level to enter the platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}