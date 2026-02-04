import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { RISK_ONBOARDING_WIZARD_KEY } from '@/lib/riskOnboarding/questions'

export async function GET(request: NextRequest) {
  await requireRoleAPI(['admin'])

  const { searchParams } = new URL(request.url)
  const profileFilter = searchParams.get('profile')
  const overriddenOnly = searchParams.get('overridden') === 'true'
  const completedFrom = searchParams.get('from')
  const completedTo = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (profileFilter) {
    where.recommendedProfile = profileFilter
  }
  if (overriddenOnly) {
    where.overriddenByAdmin = true
  }
  if (completedFrom || completedTo) {
    const range: { gte?: Date; lte?: Date } = {}
    if (completedFrom) {
      const parsed = new Date(completedFrom)
      if (!Number.isNaN(parsed.getTime())) range.gte = parsed
    }
    if (completedTo) {
      const parsed = new Date(completedTo)
      if (!Number.isNaN(parsed.getTime())) range.lte = parsed
    }
    if (range.gte || range.lte) {
      where.completedAt = range
    }
  }

  const profiles = await prisma.userRiskProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          defaultRiskProfile: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  })

  const userIds = profiles.map((profile) => profile.userId)
  const responses = userIds.length
    ? await prisma.userOnboardingResponse.findMany({
        where: {
          userId: { in: userIds },
          wizardKey: RISK_ONBOARDING_WIZARD_KEY,
        },
        select: {
          userId: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      })
    : []

  const responseByUser = new Map(responses.map((response) => [response.userId, response]))

  return NextResponse.json({
    profiles: profiles.map((profile) => {
      const onboarding = responseByUser.get(profile.userId)
      return {
        userId: profile.userId,
        userName: profile.user.name,
        userEmail: profile.user.email,
        recommendedProfile: profile.recommendedProfile,
        score: profile.score,
        drivers: profile.drivers,
        completedAt: profile.completedAt,
        version: profile.version,
        overriddenByAdmin: profile.overriddenByAdmin,
        adminOverrideProfile: profile.adminOverrideProfile,
        adminOverrideReason: profile.adminOverrideReason,
        defaultRiskProfile: profile.user.defaultRiskProfile,
        status: onboarding?.status ?? 'NOT_STARTED',
        startedAt: onboarding?.startedAt ?? null,
      }
    }),
  })
}

