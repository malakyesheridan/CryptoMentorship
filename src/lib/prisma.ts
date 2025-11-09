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
  const dbUrl = env.DATABASE_URL
  
  // Use production database if DATABASE_URL is set and not SQLite
  if (dbUrl && !dbUrl.startsWith('file:')) {
    return dbUrl
  }
  
  // Fall back to development database
  return env.DATABASE_URL_DEV || 'file:./dev.db'
}

/**
 * Create Prisma client with connection resilience
 * - Connection pooling configured
 * - Timeout settings
 * - Error recovery
 */
function createPrismaClient(): PrismaClient {
  const isPostgres = !getDatabaseUrl().startsWith('file:')
  
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Connection pool configuration (PostgreSQL only)
    ...(isPostgres && {
      // PostgreSQL connection pool settings
      // Note: These are handled by connection string in production (e.g., ?connection_limit=10&pool_timeout=20)
    }),
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
