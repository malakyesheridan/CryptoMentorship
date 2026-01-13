import { NextRequest, NextResponse } from 'next/server'
import { runPortfolioRoiJob } from '@/lib/jobs/portfolio-roi'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.VERCEL_CRON_SECRET
  if (cronSecret) {
    const providedSecret = request.nextUrl.searchParams.get('secret')
    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      )
    }
  }

  try {
    const results = await runPortfolioRoiJob()
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error in portfolio ROI job:', error)
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
