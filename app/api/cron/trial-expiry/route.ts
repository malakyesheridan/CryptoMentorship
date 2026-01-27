import { NextRequest, NextResponse } from 'next/server'
import { runTrialExpiryJob } from '@/lib/jobs/trial-expiry'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const providedSecret = request.nextUrl.searchParams.get('secret')
  const isAuthorized = isVercelCron
    || (!!cronSecret && providedSecret === cronSecret)
    || (!isProduction && !cronSecret)

  logger.info('Trial expiry cron invoked', {
    isVercelCron,
    isProduction,
    cronAuthConfigured: !!cronSecret,
    authQueryProvided: !!providedSecret,
    authorized: isAuthorized
  })

  if (!isAuthorized) {
    if (isProduction && !cronSecret) {
      logger.error('Trial expiry cron secret missing in production')
      return NextResponse.json(
        { error: 'Cron secret missing in production' },
        { status: 500 }
      )
    }
    logger.warn('Trial expiry cron unauthorized', {
      isVercelCron,
      cronAuthConfigured: !!cronSecret
    })
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const results = await runTrialExpiryJob({
      trigger: isVercelCron ? 'vercel-cron' : 'manual-cron'
    })
    return NextResponse.json({ success: true, results })
  } catch (error) {
    logger.error('Error in trial expiry job', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run trial expiry job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
