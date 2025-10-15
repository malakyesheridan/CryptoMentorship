'use client'

import { useState, useEffect } from 'react'
import ResourceUpload from './ResourceUpload'

interface AdminResourceUploadWrapperProps {
  userRole?: string
}

export default function AdminResourceUploadWrapper({ userRole }: AdminResourceUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [userRole])

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return <div className="h-32" /> // Placeholder to prevent layout shift
  }

  // Only show upload form for admin users
  if (userRole !== 'admin') {
    return null
  }

  return <ResourceUpload />
}
