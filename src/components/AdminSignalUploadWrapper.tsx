'use client'

import { useState, useEffect } from 'react'
import DailySignalUploadWrapper from './admin/DailySignalUploadWrapper'

interface AdminSignalUploadWrapperProps {
  userRole?: string
  editingSignal?: {
    id: string
    tier: 'T1' | 'T2' | 'T3'
    category?: 'majors' | 'memecoins' | null
    signal: string
    executiveSummary?: string | null
    associatedData?: string | null
  } | null
  onEditComplete?: () => void
}

export default function AdminSignalUploadWrapper({ userRole, editingSignal, onEditComplete }: AdminSignalUploadWrapperProps) {
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

  return <DailySignalUploadWrapper userRole={userRole} editingSignal={editingSignal} onEditComplete={onEditComplete} />
}
