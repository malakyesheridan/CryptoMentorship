import { NextRequest, NextResponse } from 'next/server'
import { createClientWithAdmin, getOnboardingStatus, inviteUserToClient, getClientOnboardingData } from '@/lib/client-onboarding'

// POST /api/onboarding/create-client - Create new client with admin
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const result = await createClientWithAdmin(data)
    return NextResponse.json({ 
      success: true, 
      client: result.client,
      admin: result.adminUser 
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 400 }
    )
  }
}

// GET /api/onboarding/status/[clientId] - Get onboarding status
export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const status = await getOnboardingStatus(params.clientId)
    return NextResponse.json({ status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}
