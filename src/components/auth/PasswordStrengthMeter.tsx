'use client'

import { validatePassword, getPasswordStrength } from '@/lib/password-validation'

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  if (!password) return null

  const validation = validatePassword(password)
  const strength = getPasswordStrength(password)
  const strengthPercentage = strength

  // Determine color based on strength
  let colorClass = 'bg-red-500'
  let strengthText = 'Weak'
  
  if (strength >= 70) {
    colorClass = 'bg-green-500'
    strengthText = 'Strong'
  } else if (strength >= 40) {
    colorClass = 'bg-yellow-500'
    strengthText = 'Medium'
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600">Password strength</span>
        <span className={`text-xs font-medium ${
          strength >= 70 ? 'text-green-600' : 
          strength >= 40 ? 'text-yellow-600' : 
          'text-red-600'
        }`}>
          {strengthText}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>
      {!validation.valid && validation.error && (
        <p className="text-xs text-red-600 mt-1">{validation.error}</p>
      )}
    </div>
  )
}

