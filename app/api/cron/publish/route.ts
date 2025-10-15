import { NextRequest, NextResponse } from 'next/server'
import { publishScheduledContent } from '@/lib/jobs/publish'

export async function GET(request: NextRequest) {
  // Check for VERCEL_CRON_SECRET protection
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
    const results = await publishScheduledContent()
    
    return NextResponse.json({
      success: true,
      message: `Published ${results.content} content items and ${results.episodes} episodes`,
      results,
    })
  } catch (error) {
    console.error('Error in publish job:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to publish scheduled content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
