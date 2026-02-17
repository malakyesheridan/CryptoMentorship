import { NextRequest, NextResponse } from 'next/server'
import { processEmailOutboxBatch } from '@/lib/email-outbox'
import { logger } from '@/lib/logger'

type CronAuthResult = {
  authorized: boolean
  isProduction: boolean
  cronSecretConfigured: boolean
  usedAuthorizationHeader: boolean
  providedInternalToken: boolean
  validInternalToken: boolean
}

function authorizeCronRequest(request: NextRequest): CronAuthResult {
  const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET
  const internalDispatchSecret = process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  const querySecret = request.nextUrl.searchParams.get('secret') || ''
  const internalToken = request.headers.get('x-internal-job-token') || ''
  const validInternalToken = !!internalDispatchSecret && internalToken === internalDispatchSecret

  const authorized = validInternalToken || (!!cronSecret
    ? bearerToken === cronSecret || querySecret === cronSecret
    : !isProduction)

  return {
    authorized,
    isProduction,
    cronSecretConfigured: !!cronSecret,
    usedAuthorizationHeader: authHeader.startsWith('Bearer '),
    providedInternalToken: !!internalToken,
    validInternalToken,
  }
}

export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request)

  logger.debug('Email outbox cron invoked', {
    isProduction: auth.isProduction,
    cronAuthConfigured: auth.cronSecretConfigured,
    authHeaderProvided: auth.usedAuthorizationHeader,
    authQueryProvided: !!request.nextUrl.searchParams.get('secret'),
    internalTokenProvided: auth.providedInternalToken,
    internalTokenValid: auth.validInternalToken,
    authorized: auth.authorized,
  })

  if (!auth.authorized) {
    if (auth.isProduction && !auth.cronSecretConfigured) {
      logger.error('Email outbox cron secret missing in production')
      return NextResponse.json(
        { error: 'Cron secret missing in production' },
        { status: 500 }
      )
    }

    logger.info('Email outbox cron unauthorized (noise)', {
      cronAuthConfigured: auth.cronSecretConfigured,
      authHeaderProvided: auth.usedAuthorizationHeader,
      noise: true,
    })
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const results = await processEmailOutboxBatch({ limit: 50 })
    return NextResponse.json({ success: true, results })
  } catch (error) {
    logger.error('Error in email outbox cron', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process email outbox',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
