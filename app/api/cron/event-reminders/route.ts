import { NextRequest, NextResponse } from 'next/server'
import { sendEventReminders } from '@/lib/jobs/event-reminders'

export const dynamic = 'force-dynamic'

// GET /api/cron/event-reminders - Trigger event reminder job
export async function GET(request: NextRequest) {
  try {
    const secret = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (secret !== process.env.VERCEL_CRON_SECRET && 
        secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await sendEventReminders()
    
    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Error running event reminders job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
