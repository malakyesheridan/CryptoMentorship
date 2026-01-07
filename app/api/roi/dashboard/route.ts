import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { getRoiDashboardPayload } from '@/lib/roi-dashboard'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getRoiDashboardPayload()
    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 })
  }
}
