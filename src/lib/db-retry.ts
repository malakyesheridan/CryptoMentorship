/**
 * Database retry utilities with exponential backoff
 * Handles transient database errors gracefully
 */

import { Prisma } from '@prisma/client'
import { isRetryableError } from './errors'

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_INITIAL_DELAY_MS = 100
const DEFAULT_MAX_DELAY_MS = 2000

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  onRetry?: (attempt: number, error: unknown) => void
}

/**
 * Retry a database operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    onRetry,
  } = options

  let lastError: unknown
  let delay = initialDelayMs

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error
      }

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, error)
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Increase delay for next retry (exponential backoff)
      delay = Math.min(delay * 2, maxDelayMs)
    }
  }

  throw lastError
}

/**
 * Execute a Prisma query with retry logic
 */
export async function prismaQueryWithRetry<T>(
  query: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return withRetry(query, options)
}

/**
 * Execute a transaction with retry logic
 */
export async function prismaTransactionWithRetry<T>(
  client: Prisma.TransactionClient | any,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  // For transactions, we need to check if client has $transaction method
  if (typeof client.$transaction === 'function') {
    return withRetry(
      () => client.$transaction(operation),
      options
    )
  }
  
  // If already in transaction, just execute
  return operation(client as Prisma.TransactionClient)
}

