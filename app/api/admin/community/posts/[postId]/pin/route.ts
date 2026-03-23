import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { revalidateDashboardAnnouncements } from '@/lib/revalidate'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await params
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    })

    await revalidateDashboardAnnouncements()

    return NextResponse.json({ isPinned: updated.isPinned })
  } catch (error) {
    console.error('Error toggling pin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
