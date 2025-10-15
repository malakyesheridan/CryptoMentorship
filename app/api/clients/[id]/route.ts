import { NextRequest, NextResponse } from 'next/server'
import { 
  getClient, 
  updateClient, 
  deleteClient,
  getClientUsers,
  getClientStats
} from '@/lib/client-management'

// GET /api/clients/[id] - Get specific client
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient(params.id)
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ client })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}

// PUT /api/clients/[id] - Update client (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json()
    const client = await updateClient(params.id, data)
    return NextResponse.json({ client })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}

// DELETE /api/clients/[id] - Delete client (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteClient(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}
