import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reportSchema = z.object({ reason: z.string().min(1).max(1000) })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { postId } = await params
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const json = await request.json()
    const { reason } = reportSchema.parse(json)

    const report = await prisma.report.create({
      data: { reporterId: session.user.id, postId, reason },
    })
    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    console.error('Error reporting post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
