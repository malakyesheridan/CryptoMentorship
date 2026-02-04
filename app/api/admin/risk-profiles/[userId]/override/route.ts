import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'

const overrideSchema = z.object({
  profile: z.enum(['CONSERVATIVE', 'SEMI', 'AGGRESSIVE']),
  reason: z.string().min(2),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  await requireRoleAPI(['admin'])

  const body = await request.json()
  const parsed = overrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const userId = params.userId
  const existing = await prisma.userRiskProfile.findUnique({
    where: { userId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Risk profile not found' }, { status: 404 })
  }

  const updated = await prisma.userRiskProfile.update({
    where: { userId },
    data: {
      overriddenByAdmin: true,
      adminOverrideProfile: parsed.data.profile,
      adminOverrideReason: parsed.data.reason,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({
    userId: updated.userId,
    overriddenByAdmin: updated.overriddenByAdmin,
    adminOverrideProfile: updated.adminOverrideProfile,
    adminOverrideReason: updated.adminOverrideReason,
  })
}

