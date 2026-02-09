import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

const DEFAULT_MAX_ATTEMPTS = 4
const BACKOFF_MS = [250, 750, 1500]

export type DbRetryMode = 'read' | 'idempotent-write' | 'write'

interface DbRetryOptions {
  mode?: DbRetryMode
  idempotencyKey?: string
  maxAttempts?: number
  operationName?: string
  onRetry?: (attempt: number, error: unknown) => void
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPrismaErrorCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return (error as any).errorCode ?? undefined
  }

  return undefined
}

export function isTransientDbError(error: unknown): boolean {
  const code = getPrismaErrorCode(error)
  if (code === 'P1001') {
    return true
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (message.includes('server closed the connection unexpectedly')) {
    return true
  }

  const nodeCode = error && typeof error === 'object' && 'code' in error ? String((error as any).code) : ''
  return nodeCode === 'ECONNRESET' || nodeCode === 'ETIMEDOUT'
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: DbRetryOptions = {}
): Promise<T> {
  const mode = options.mode ?? 'read'
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
  const canRetry =
    mode === 'read' ||
    (mode === 'idempotent-write' && typeof options.idempotencyKey === 'string' && options.idempotencyKey.length > 0)

  if (!canRetry) {
    return operation()
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const shouldRetry = attempt < maxAttempts && isTransientDbError(error)
      if (!shouldRetry) {
        throw error
      }

      options.onRetry?.(attempt, error)
      logger.warn('Retrying transient database operation', {
        operationName: options.operationName ?? 'db_operation',
        attempt,
        maxAttempts,
        errorCode: getPrismaErrorCode(error),
        idempotencyKey: options.idempotencyKey,
      })

      const delay = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]
      await sleep(delay)
    }
  }

  throw lastError
}

