import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const updateBody = z.object({
  themePreference: z.enum(['light', 'dark', 'system']),
})

/**
 * GET /api/me/theme
 * Returns the current user's persisted theme preference.
 */
export async function GET() {
  try {
    const user = await requireUser()
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { themePreference: true },
    })
    return NextResponse.json({
      themePreference: row?.themePreference ?? 'dark',
    })
  } catch (error) {
    logger.error(
      'Get theme preference error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Failed to load theme preference' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/me/theme
 * Body: { themePreference: 'light' | 'dark' | 'system' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = updateBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { themePreference: parsed.data.themePreference },
    })

    return NextResponse.json({ themePreference: parsed.data.themePreference })
  } catch (error) {
    logger.error(
      'Update theme preference error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Failed to update theme preference' },
      { status: 500 }
    )
  }
}
