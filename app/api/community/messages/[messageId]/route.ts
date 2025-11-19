import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// DELETE /api/community/messages/[messageId] - Delete message (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTH', message: 'Sign in required' },
      { status: 401 },
    )
  }

  // Check if user has admin privileges
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || !['admin', 'editor'].includes(user.role)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Admin privileges required' },
      { status: 403 },
    )
  }

  const { messageId } = await params

  if (!messageId) {
    return NextResponse.json(
      { ok: false, code: 'BAD_REQUEST', message: 'messageId is required' },
      { status: 400 },
    )
  }

  try {
    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    })

    if (!message) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Message not found' },
        { status: 404 },
      )
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId },
    })

    return NextResponse.json({ ok: true, message: 'Message deleted successfully' })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to delete message' },
      { status: 500 },
    )
  }
}

