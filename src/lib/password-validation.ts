/**
 * Password validation utility
 * Ensures passwords meet security requirements
 */

export interface PasswordValidation {
  valid: boolean
  error?: string
  strength: 'weak' | 'medium' | 'strong'
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 */
export function validatePassword(password: string): PasswordValidation {
  // Check minimum length
  if (password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long',
      strength: 'weak',
    }
  }

  // Check character requirements
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\[\]\\/_+\-=\s]/.test(password)

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      error: 'Password must contain uppercase, lowercase, number, and special character',
      strength: 'weak',
    }
  }

  // Check common passwords (basic check)
  const commonPasswords = [
    'password',
    '123456',
    'qwerty',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
    'password123',
    'password1',
    'admin123',
  ]
  const lowerPassword = password.toLowerCase()
  if (commonPasswords.some(cp => lowerPassword.includes(cp))) {
    return {
      valid: false,
      error: 'Password is too common. Please choose a more unique password.',
      strength: 'weak',
    }
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (password.length >= 16 && hasUpper && hasLower && hasNumber && hasSpecial) {
    strength = 'strong'
  } else if (password.length >= 12) {
    strength = 'medium'
  }

  return {
    valid: true,
    strength,
  }
}

/**
 * Get password strength score (0-100)
 */
export function getPasswordStrength(password: string): number {
  let score = 0

  // Length scoring
  if (password.length >= 12) score += 20
  if (password.length >= 16) score += 10
  if (password.length >= 20) score += 10

  // Character variety
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^a-zA-Z0-9]/.test(password)) score += 10

  // Complexity bonus
  const uniqueChars = new Set(password).size
  if (uniqueChars >= password.length * 0.7) score += 10

  return Math.min(100, score)
}

