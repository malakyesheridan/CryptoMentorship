import { PrismaClient } from '@prisma/client'

// Database connection utility that handles both dev and production
class DatabaseManager {
  private static instance: DatabaseManager
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.getDatabaseUrl()
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    })
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  public getPrisma(): PrismaClient {
    return this.prisma
  }

  private getDatabaseUrl(): string {
    // Use production database if DATABASE_URL is set and not SQLite
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
      return process.env.DATABASE_URL
    }
    
    // Fall back to development database
    return process.env.DATABASE_URL_DEV || 'file:./dev.db'
  }

  public async connect(): Promise<void> {
    await this.prisma.$connect()
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  public isProduction(): boolean {
    return this.getDatabaseUrl().startsWith('postgresql://')
  }

  public isDevelopment(): boolean {
    return this.getDatabaseUrl().startsWith('file:')
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance()
export const prisma = dbManager.getPrisma()

// Export for backward compatibility
export { prisma as default }
