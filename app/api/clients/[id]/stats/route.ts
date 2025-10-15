import { NextRequest, NextResponse } from 'next/server'
import { getClientStats } from '@/lib/client-management'

// GET /api/clients/[id]/stats - Get stats for a client
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await getClientStats(params.id)
    return NextResponse.json({ stats })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}
