import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_DEV: z.string().optional(),
  
  // NextAuth (required - will have defaults applied)
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email (optional - allow empty strings and display name format)
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.preprocess(
    (val) => {
      if (!val || val === '') return undefined
      const strVal = String(val)
      // Handle format like "Display Name <email@example.com>"
      const emailMatch = strVal.match(/<([^>]+)>/) || strVal.match(/^([^\s<]+@[^\s>]+)$/)
      return emailMatch ? emailMatch[1] : strVal
    },
    z.string().email().optional()
  ),
  
  // Redis (optional)
  UPSTASH_REDIS_REST_URL: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.string().url().optional()
  ),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal('')),
  
  // Stripe Configuration (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Stripe Price IDs (optional - create in Stripe Dashboard)
  // Foundation (T1)
  STRIPE_PRICE_T1_MONTHLY: z.string().optional(),
  STRIPE_PRICE_T1_3MONTH: z.string().optional(),
  STRIPE_PRICE_T1_6MONTH: z.string().optional(),
  STRIPE_PRICE_T1_ANNUAL: z.string().optional(),
  // Growth (T2)
  STRIPE_PRICE_T2_MONTHLY: z.string().optional(),
  STRIPE_PRICE_T2_3MONTH: z.string().optional(),
  STRIPE_PRICE_T2_6MONTH: z.string().optional(),
  STRIPE_PRICE_T2_ANNUAL: z.string().optional(),
  // Elite (T3)
  STRIPE_PRICE_T3_MONTHLY: z.string().optional(),
  STRIPE_PRICE_T3_3MONTH: z.string().optional(),
  STRIPE_PRICE_T3_6MONTH: z.string().optional(),
  STRIPE_PRICE_T3_ANNUAL: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  
  // Public vars
  NEXT_PUBLIC_GOOGLE_ENABLED: z.string().optional(),
  NEXT_PUBLIC_EMAIL_ENABLED: z.string().optional(),
  
  // Referral System Configuration (optional)
  REFERRAL_SYSTEM_ENABLED: z.string().optional(), // 'false' to disable, otherwise enabled
  REFERRAL_COMMISSION_RATE: z.string().optional(), // Default: 0.15 (15%)
  REFERRAL_COOKIE_EXPIRY_DAYS: z.string().optional(), // Default: 30
  REFERRAL_CODE_EXPIRY_DAYS: z.string().optional(), // Optional expiration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(), // Base URL for affiliate links
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    // Provide defaults for development - only if value is missing or invalid
    const envWithDefaults = { ...process.env }
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
    
    // Check NEXTAUTH_SECRET - if missing or too short, use default (only in dev)
    if (!envWithDefaults.NEXTAUTH_SECRET || envWithDefaults.NEXTAUTH_SECRET.length < 32) {
      if (isProduction) {
        throw new Error('NEXTAUTH_SECRET must be at least 32 characters in production')
      }
      envWithDefaults.NEXTAUTH_SECRET = 'dev-secret-key-for-local-development-only-not-for-production-use'
    }
    
    // Check NEXTAUTH_URL - CRITICAL: No localhost fallback in production
    if (!envWithDefaults.NEXTAUTH_URL || !envWithDefaults.NEXTAUTH_URL.startsWith('http')) {
      if (isProduction) {
        throw new Error('NEXTAUTH_URL must be set to your production URL (e.g., https://yourdomain.com)')
      }
      envWithDefaults.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    }
    
    // Check NODE_ENV - if missing, use default
    if (!envWithDefaults.NODE_ENV) {
      envWithDefaults.NODE_ENV = 'development'
    }
    
    return envSchema.parse(envWithDefaults)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((e: z.ZodIssue) => `  - ${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        `❌ Invalid environment variables:\n${missing}\n\n` +
        `Please check your .env file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

export const env = validateEnv()

// Referral system configuration helpers
function getAppUrl(): string {
  // Priority: NEXT_PUBLIC_APP_URL > NEXTAUTH_URL > localhost (dev only)
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL
  const authUrl = process.env.NEXTAUTH_URL
  
  // In production, prefer NEXT_PUBLIC_APP_URL
  if (process.env.NODE_ENV === 'production') {
    if (publicUrl && publicUrl.startsWith('http')) {
      return publicUrl.replace(/\/$/, '') // Remove trailing slash
    }
    if (authUrl && authUrl.startsWith('http')) {
      return authUrl.replace(/\/$/, '')
    }
    // Production should have a URL set
    console.warn('[Referral] No production URL configured. Using fallback.')
  }
  
  // Development: use NEXT_PUBLIC_APP_URL if set, otherwise try to detect current port
  if (publicUrl && publicUrl.startsWith('http')) {
    return publicUrl.replace(/\/$/, '')
  }
  
  // In development, try to use the current request URL or fallback to common dev ports
  // Check if we're in a server context and can detect the port
  if (typeof window === 'undefined' && process.env.PORT) {
    const port = process.env.PORT
    return `http://localhost:${port}`
  }
  
  // Try NEXTAUTH_URL but prefer port 5000 (common dev port)
  if (authUrl && authUrl.startsWith('http')) {
    // If NEXTAUTH_URL is on a different port, use port 5000 for consistency
    const url = new URL(authUrl)
    if (url.port === '5001' || url.port === '3000') {
      return `http://localhost:5000`
    }
    return authUrl.replace(/\/$/, '')
  }
  
  // Last resort: localhost:5000 (common dev port)
  return 'http://localhost:5000'
}

export const referralConfig = {
  enabled: process.env.REFERRAL_SYSTEM_ENABLED !== 'false', // Default: enabled
  // Commission rates: 25% for initial payments, 10% for recurring payments
  // These are hardcoded in calculateCommission() but kept here for documentation
  initialCommissionRate: 0.25, // 25% commission on initial payment
  recurringCommissionRate: 0.10, // 10% commission on recurring payments
  // Legacy: kept for backward compatibility, but not used anymore
  commissionRate: parseFloat(process.env.REFERRAL_COMMISSION_RATE || '0.15'),
  cookieExpiryDays: parseInt(process.env.REFERRAL_COOKIE_EXPIRY_DAYS || '30', 10),
  codeExpiryDays: process.env.REFERRAL_CODE_EXPIRY_DAYS 
    ? parseInt(process.env.REFERRAL_CODE_EXPIRY_DAYS, 10) 
    : null,
  appUrl: getAppUrl(),
}

