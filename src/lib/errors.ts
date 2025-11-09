/**
 * Database and API error handling utilities
 * Provides consistent error handling across the application
 */

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export enum ErrorType {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  DATABASE = 'DATABASE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL = 'INTERNAL',
}

export interface ApiError {
  type: ErrorType
  message: string
  details?: any
  statusCode: number
}

/**
 * Convert Prisma errors to API errors with appropriate status codes
 */
export function handlePrismaError(error: unknown): ApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          type: ErrorType.CONFLICT,
          message: 'A record with this value already exists',
          details: error.meta,
          statusCode: 409,
        }
      case 'P2003':
        // Foreign key constraint violation
        return {
          type: ErrorType.VALIDATION,
          message: 'Invalid reference to related record',
          details: error.meta,
          statusCode: 400,
        }
      case 'P2025':
        // Record not found
        return {
          type: ErrorType.NOT_FOUND,
          message: 'Record not found',
          details: error.meta,
          statusCode: 404,
        }
      case 'P2021':
        // Table does not exist
        return {
          type: ErrorType.DATABASE,
          message: 'Database table does not exist',
          details: error.meta,
          statusCode: 500,
        }
      case 'P2024':
        // Operation timed out
        return {
          type: ErrorType.SERVICE_UNAVAILABLE,
          message: 'Database operation timed out',
          details: error.meta,
          statusCode: 503,
        }
      default:
        return {
          type: ErrorType.DATABASE,
          message: 'Database error occurred',
          details: { code: error.code, meta: error.meta },
          statusCode: 500,
        }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Invalid data provided',
      details: error.message,
      statusCode: 400,
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      type: ErrorType.SERVICE_UNAVAILABLE,
      message: 'Database connection failed',
      details: error.message,
      statusCode: 503,
    }
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      type: ErrorType.SERVICE_UNAVAILABLE,
      message: 'Database engine error',
      details: error.message,
      statusCode: 503,
    }
  }

  // Unknown error
  return {
    type: ErrorType.INTERNAL,
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    statusCode: 500,
  }
}

/**
 * Create a NextResponse from an error
 */
export function errorResponse(error: ApiError, logError = true): NextResponse {
  if (logError) {
    console.error(`[${error.type}] ${error.message}`, error.details || '')
  }

  return NextResponse.json(
    {
      error: error.type,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
    { status: error.statusCode }
  )
}

/**
 * Handle errors and return appropriate NextResponse
 */
export function handleError(error: unknown, logError = true): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError) {
    const apiError = handlePrismaError(error)
    return errorResponse(apiError, logError)
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return errorResponse({
      type: ErrorType.VALIDATION,
      message: 'Validation failed',
      details: error,
      statusCode: 400,
    }, logError)
  }

  // Generic error
  const apiError: ApiError = {
    type: ErrorType.INTERNAL,
    message: error instanceof Error ? error.message : 'Internal server error',
    statusCode: 500,
  }

  return errorResponse(apiError, logError)
}

/**
 * Check if error is a transient database error that should be retried
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Retry on timeout or connection errors
    return ['P2024', 'P1001', 'P1002', 'P1008'].includes(error.code)
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true
  }

  return false
}

