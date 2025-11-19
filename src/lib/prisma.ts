import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Get database URL with proper fallback logic
 * - Uses DATABASE_URL if it's a PostgreSQL connection
 * - Falls back to DATABASE_URL_DEV for SQLite development
 */
function getDatabaseUrl(): string {
  // Check process.env directly first (Next.js loads .env automatically)
  const dbUrl = process.env.DATABASE_URL || env.DATABASE_URL
  
  // Use production database if DATABASE_URL is set and not SQLite
  if (dbUrl && typeof dbUrl === 'string' && dbUrl.trim() !== '' && !dbUrl.startsWith('file:')) {
    // Validate PostgreSQL URL format
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      throw new Error(
        `Invalid DATABASE_URL format. Expected postgresql:// or postgres://, but got: ${dbUrl.substring(0, 30)}...`
      )
    }
    return dbUrl
  }
  
  // If DATABASE_URL is SQLite but schema requires PostgreSQL, throw error
  if (dbUrl && dbUrl.startsWith('file:')) {
    throw new Error(
      'DATABASE_URL is set to SQLite (file:./dev.db) but Prisma schema requires PostgreSQL. ' +
      'Please update DATABASE_URL in your .env file with a PostgreSQL connection string (e.g., postgresql://...).'
    )
  }
  
  // Fall back to development database
  const devUrl = process.env.DATABASE_URL_DEV || env.DATABASE_URL_DEV
  if (devUrl && typeof devUrl === 'string' && devUrl.trim() !== '') {
    return devUrl
  }
  
  // If no DATABASE_URL is set and schema requires PostgreSQL, throw error
  throw new Error(
    'DATABASE_URL is required but not set. ' +
    'Please set DATABASE_URL in your .env file with a PostgreSQL connection string. ' +
    'Get your connection string from Neon console: https://console.neon.tech'
  )
}

/**
 * Create Prisma client with connection resilience
 * - Connection pooling configured
 * - Timeout settings
 * - Error recovery
 */
function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl()
  const isPostgres = !dbUrl.startsWith('file:')
  
  // Validate URL format for PostgreSQL
  if (isPostgres && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('Invalid DATABASE_URL format. Expected postgresql:// or postgres://, got:', dbUrl.substring(0, 20) + '...')
    throw new Error('Invalid DATABASE_URL format. Must start with postgresql:// or postgres://')
  }
  
  // Optimize connection string for pooling
  let optimizedUrl = dbUrl
  if (isPostgres) {
    const url = new URL(dbUrl)
    // Add connection pooling parameters if not already present
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '10') // Limit concurrent connections
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20') // 20 second timeout
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10') // 10 second connect timeout
    }
    optimizedUrl = url.toString()
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: optimizedUrl
      }
    },
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Create Prisma client with singleton pattern
const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Add connection error handling
prisma.$on('error' as never, (e: any) => {
  // Use console.error here as logger might not be initialized yet
  if (env.NODE_ENV === 'development') {
    console.error('Prisma client error:', e)
  }
})

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export { prisma }
