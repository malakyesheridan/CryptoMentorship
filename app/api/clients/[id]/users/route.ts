import { NextRequest, NextResponse } from 'next/server'
import { getClientUsers, getClientStats } from '@/lib/client-management'

// GET /api/clients/[id]/users - Get users for a client
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const users = await getClientUsers(params.id)
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}
