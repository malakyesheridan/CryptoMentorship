'use client'

import { useState, useEffect } from 'react'
import MacroVideoUpload from './MacroVideoUpload'

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

  // Only show upload form for admin users (or always for testing)
  if (userRole !== 'admin' && userRole !== 'guest') {
    return null
  }

  return <MacroVideoUpload />
}
