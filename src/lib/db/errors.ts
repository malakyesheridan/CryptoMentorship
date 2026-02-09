import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getPrismaErrorCode } from '@/lib/db/retry'

const DB_UNREACHABLE_MESSAGE = 'Database temporarily unreachable. Try again in 30 seconds.'

function parseHost(urlValue: string | undefined): string | null {
  if (!urlValue) return null
  try {
    return new URL(urlValue).host
  } catch {
    return null
  }
}

export function getDatabaseHost(): string | null {
  return parseHost(process.env.DATABASE_URL)
}

export function isDbUnreachableError(error: unknown): boolean {
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

export function toDbUnreachableResponse() {
  return NextResponse.json(
    {
      error: 'db_unreachable',
      message: DB_UNREACHABLE_MESSAGE,
      host: getDatabaseHost(),
    },
    { status: 503 }
  )
}

export function toPrismaRouteErrorResponse(error: unknown, fallbackMessage = 'Request failed') {
  if (isDbUnreachableError(error)) {
    return toDbUnreachableResponse()
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'conflict',
          message: 'A record with this value already exists.',
          code: error.code,
        },
        { status: 409 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'not_found',
          message: 'Record not found.',
          code: error.code,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'prisma_error',
        message: fallbackMessage,
        code: error.code,
      },
      { status: 400 }
    )
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return toDbUnreachableResponse()
  }

  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: 'Invalid request payload.',
      },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      error: 'internal_error',
      message: fallbackMessage,
    },
    { status: 500 }
  )
}

export { DB_UNREACHABLE_MESSAGE }

