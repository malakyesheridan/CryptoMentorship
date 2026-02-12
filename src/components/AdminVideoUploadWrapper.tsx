'use client'

import { useState, useEffect } from 'react'
import CryptoCompassVideoUpload from './CryptoCompassVideoUpload'

interface AdminVideoUploadWrapperProps {
  userRole?: string
}

export default function AdminVideoUploadWrapper({ userRole }: AdminVideoUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return <div className="h-32" /> // Placeholder to prevent layout shift
  }

  // Only show upload form for admin/editor users (or always for testing)
  if (!['admin', 'editor', 'guest'].includes(userRole || '')) {
    return null
  }

  return <CryptoCompassVideoUpload />
}
