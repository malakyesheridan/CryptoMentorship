'use client'

import { useState, useEffect } from 'react'
import DailySignalUploadWrapper from './admin/DailySignalUploadWrapper'

interface AdminSignalUploadWrapperProps {
  userRole?: string
}

export default function AdminSignalUploadWrapper({ userRole }: AdminSignalUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [userRole])

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return <div className="h-32" /> // Placeholder to prevent layout shift
  }

  // Only show upload form for admin/editor users
  if (userRole !== 'admin' && userRole !== 'editor') {
    return null
  }

  return <DailySignalUploadWrapper userRole={userRole} />
}
