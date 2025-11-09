'use client'

import { useState, useEffect } from 'react'
import CryptoCompassUpload from './CryptoCompassUpload'

interface AdminCryptoCompassUploadWrapperProps {
  userRole?: string
}

export default function AdminCryptoCompassUploadWrapper({ userRole }: AdminCryptoCompassUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return <div className="h-32" /> // Placeholder to prevent layout shift
  }

  // Only show upload form for admin users
  if (userRole !== 'admin') {
    return null
  }

  return <CryptoCompassUpload />
}

