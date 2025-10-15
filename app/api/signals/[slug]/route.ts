import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/signals/[slug] - Get individual signal by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const signal = await prisma.signalTrade.findUnique({
      where: { slug: params.slug },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    return NextResponse.json(signal)
  } catch (error) {
    console.error('Error fetching signal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
