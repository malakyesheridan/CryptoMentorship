'use client'

import { useState, useEffect } from 'react'
import EpisodeUpload from './EpisodeUpload'

interface AdminEpisodeUploadWrapperProps {
  userRole?: string
}

export default function AdminEpisodeUploadWrapper({ userRole }: AdminEpisodeUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [userRole])

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return <div className="h-32" /> // Placeholder to prevent layout shift
  }

  // Only show upload form for admin/editor users
  if (!['admin', 'editor'].includes(userRole || '')) {
    return null
  }

  return <EpisodeUpload />
}
