import { NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { getRoiDashboardPayload } from '@/lib/roi-dashboard'

export async function GET() {
  try {
    await requireRoleAPI(['admin'])
    const payload = await getRoiDashboardPayload({ forceRefresh: true })

    return NextResponse.json({
      metrics: payload.metrics,
      validation: payload.validation,
      counts: {
        model: payload.series.model.length,
        btc: payload.series.btc.length,
        eth: payload.series.eth.length,
        changeLogEvents: payload.changeLogEvents.length
      }
    })
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to load preview.' }, { status: 500 })
  }
}
