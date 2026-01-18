import { NextRequest, NextResponse } from 'next/server'
import { runPortfolioRoiJob } from '@/lib/jobs/portfolio-roi'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const providedSecret = request.nextUrl.searchParams.get('secret')
  const portfolioKey = request.nextUrl.searchParams.get('portfolioKey')?.toLowerCase() ?? undefined
  const isAuthorized = isVercelCron
    || (!!cronSecret && providedSecret === cronSecret)
    || (!isProduction && !cronSecret)

  logger.info('Portfolio ROI cron invoked', {
    isVercelCron,
    isProduction,
    cronAuthConfigured: !!cronSecret,
    authQueryProvided: !!providedSecret,
    authorized: isAuthorized,
    portfolioKey: portfolioKey ?? null
  })

  if (!isAuthorized) {
    if (isProduction && !cronSecret) {
      logger.error('Portfolio ROI cron secret missing in production')
      return NextResponse.json(
        { error: 'Cron secret missing in production' },
        { status: 500 }
      )
    }
    logger.warn('Portfolio ROI cron unauthorized', {
      isVercelCron,
      cronAuthConfigured: !!cronSecret
    })
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const results = await runPortfolioRoiJob({
      portfolioKey,
      trigger: isVercelCron ? 'vercel-cron' : 'manual-cron'
    })
    return NextResponse.json({ success: true, results })
  } catch (error) {
    logger.error('Error in portfolio ROI job', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to recompute portfolio ROI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
