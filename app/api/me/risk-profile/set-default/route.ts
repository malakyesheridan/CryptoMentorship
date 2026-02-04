import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

const setDefaultSchema = z.object({
  profile: z.enum(['CONSERVATIVE', 'SEMI', 'AGGRESSIVE']),
})

export async function POST(request: NextRequest) {
  const user = await requireUser()
  const body = await request.json()
  const parsed = setDefaultSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultRiskProfile: parsed.data.profile,
    },
    select: { defaultRiskProfile: true },
  })

  return NextResponse.json({ defaultRiskProfile: updated.defaultRiskProfile })
}

