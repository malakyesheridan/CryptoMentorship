'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CircularProgressProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  showPercentage?: boolean
  className?: string
  animated?: boolean
}

export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#3b82f6', // blue-500
  backgroundColor = '#e2e8f0', // slate-200
  showPercentage = true,
  className = '',
  animated = true
}: CircularProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference

  useEffect(() => {
    if (animated) {
      // Animate progress from 0 to target value
      const duration = 1000 // 1 second
      const startTime = Date.now()
      const startProgress = 0
      const targetProgress = Math.max(0, Math.min(100, progress))

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progressRatio = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3)
        const currentProgress = startProgress + (targetProgress - startProgress) * easeOutCubic
        
        setAnimatedProgress(currentProgress)
        
        if (progressRatio < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      requestAnimationFrame(animate)
    } else {
      setAnimatedProgress(progress)
    }
  }, [progress, animated])

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={animated ? 'transition-all duration-300 ease-out' : ''}
        />
      </svg>
      
      {/* Percentage text */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-700">
            {Math.round(animatedProgress)}%
          </span>
        </div>
      )}
    </div>
  )
}
