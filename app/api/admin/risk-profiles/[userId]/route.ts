import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  await requireRoleAPI(['admin'])

  const userId = params.userId

  const [user, onboarding, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, defaultRiskProfile: true },
    }),
    prisma.userOnboardingResponse.findUnique({
      where: {
        userId_wizardKey: {
          userId,
          wizardKey: RISK_ONBOARDING_WIZARD_KEY,
        },
      },
    }),
    prisma.userRiskProfile.findUnique({
      where: { userId },
    }),
  ])

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    user,
    onboarding,
    profile,
  })
}

