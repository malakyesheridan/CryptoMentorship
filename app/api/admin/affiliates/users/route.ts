import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('q') || '').trim()
    const excludeId = searchParams.get('exclude') || undefined

    if (query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        referralSlug: true,
        role: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        referralSlug: user.referralSlug,
        role: user.role
      }))
    })
  } catch (error) {
    logger.error(
      'Failed to search users for affiliate linking',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
