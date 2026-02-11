import { NextRequest, NextResponse } from 'next/server'
import { sendSignalEmails } from '@/lib/jobs/send-signal-emails'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): { ok: boolean; isProduction: boolean; cronConfigured: boolean } {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const providedSecret = request.nextUrl.searchParams.get('secret')
  const authorized = isVercelCron
    || (!!cronSecret && providedSecret === cronSecret)
    || (!isProduction && !cronSecret)

  return {
    ok: authorized,
    isProduction,
    cronConfigured: !!cronSecret
  }
}

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request)
  if (!auth.ok) {
    if (auth.isProduction && !auth.cronConfigured) {
      logger.error('Signal email cron secret missing in production')
      return NextResponse.json(
        { error: 'Cron secret missing in production' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  const signalId = request.nextUrl.searchParams.get('signalId')?.trim()
  if (!signalId) {
    return NextResponse.json({ error: 'Missing signalId' }, { status: 400 })
  }

  logger.info('Signal email cron invoked', { signalId })
  await sendSignalEmails(signalId)
  return NextResponse.json({ success: true, signalId })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
