import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'PENDING'

    const reports = await prisma.report.findMany({
      where: { status: status as any },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        post: { select: { id: true, body: true, authorId: true, author: { select: { name: true } } } },
        comment: { select: { id: true, body: true, authorId: true, author: { select: { name: true } } } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
