import { NextRequest, NextResponse } from 'next/server'
import { runAffiliatePayableJob } from '@/lib/jobs/affiliate-payables'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const providedSecret = request.nextUrl.searchParams.get('secret')
  const isProduction = process.env.NODE_ENV === 'production'

  const isAuthorized = isVercelCron
    || (!!cronSecret && providedSecret === cronSecret)
    || (!isProduction && !cronSecret)

  logger.info('Affiliate payable cron invoked', {
    isVercelCron,
    cronAuthConfigured: !!cronSecret
  })

  if (!isAuthorized) {
    if (isProduction && !cronSecret) {
      logger.error('Affiliate payable cron secret missing in production')
    }
    logger.warn('Affiliate payable cron unauthorized', {
      cronAuthConfigured: !!cronSecret
    })
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const result = await runAffiliatePayableJob({
      trigger: isVercelCron ? 'vercel-cron' : 'manual-cron'
    })
    return NextResponse.json({ success: true, result })
  } catch (error) {
    logger.error('Error in affiliate payable job', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to run affiliate payable job' },
      { status: 500 }
    )
  }
}
