import { NextRequest, NextResponse } from 'next/server'
import { runTrialReminder7DayDigest } from '@/lib/jobs/trial-reminder-7d'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const providedSecret = request.nextUrl.searchParams.get('secret')
  const isAuthorized = isVercelCron
    || (!!cronSecret && providedSecret === cronSecret)
    || (!isProduction && !cronSecret)

  logger.info('Trial reminder cron invoked', {
    isVercelCron,
    isProduction,
    cronAuthConfigured: !!cronSecret,
    authQueryProvided: !!providedSecret,
    authorized: isAuthorized
  })

  if (!isAuthorized) {
    if (isProduction && !cronSecret) {
      logger.error('Trial reminder cron secret missing in production')
      return NextResponse.json(
        { error: 'Cron secret missing in production' },
        { status: 500 }
      )
    }
    logger.warn('Trial reminder cron unauthorized', {
      isVercelCron,
      cronAuthConfigured: !!cronSecret
    })
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const results = await runTrialReminder7DayDigest({
      trigger: isVercelCron ? 'vercel-cron' : 'manual-cron'
    })
    return NextResponse.json({ success: true, results })
  } catch (error) {
    logger.error('Error in trial reminder cron', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run trial reminder digest',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
