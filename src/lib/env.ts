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

