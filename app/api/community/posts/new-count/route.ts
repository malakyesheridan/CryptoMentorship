import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')

    if (!since) {
      return NextResponse.json({ error: 'Missing "since" parameter' }, { status: 400 })
    }

    const sinceDate = new Date(since)
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const count = await prisma.post.count({
      where: {
        createdAt: { gt: sinceDate },
        isShadowHidden: false,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error counting new posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
