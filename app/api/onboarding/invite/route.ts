import { NextRequest, NextResponse } from 'next/server'
import { inviteUserToClient, getClientOnboardingData } from '@/lib/client-onboarding'

// POST /api/onboarding/invite - Invite user to client
export async function POST(req: NextRequest) {
  try {
    const { clientId, email, role } = await req.json()
    const result = await inviteUserToClient(clientId, email, role)
    return NextResponse.json({ 
      success: true, 
      user: result.user,
      isNewUser: result.isNewUser 
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 400 }
    )
  }
}

// GET /api/onboarding/data/[clientId] - Get client onboarding data
export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const data = await getClientOnboardingData(params.clientId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 403 }
    )
  }
}
