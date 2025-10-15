import { NextRequest, NextResponse } from 'next/server'
import { 
  createClient, 
  getAllClients, 
  getClient, 
  updateClient, 
  deleteClient,
  assignUserToClient,
  removeUserFromClient,
  getClientUsers,
  getClientStats
} from '@/lib/client-management'

// GET /api/clients - Get all clients (admin only)
export async function GET() {
  try {
    const clients = await getAllClients()
    return NextResponse.json({ clients })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}

// POST /api/clients - Create new client (admin only)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const client = await createClient(data)
    return NextResponse.json({ client })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}
