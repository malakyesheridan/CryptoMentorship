import { prisma } from '@/lib/prisma'
import { formatDate, formatRelative } from './dates'
import type { ChatMessage } from './community/types'

export async function getChannels() {
  return await prisma.channel.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    }
  })
}

export async function getChannelBySlug(slug: string) {
  return await prisma.channel.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          messages: true
        }
      }
    }
  })
}

export async function getMessages(channelId: string, limit = 50): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: {
      channelId
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      }
    }
  })

  return rows.map((row) => ({
    id: row.id,
    channelId: row.channelId,
    userId: row.userId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.user?.id ?? row.userId,
      name: row.user?.name ?? null,
      image: row.user?.image ?? null,
    },
  }))
}

export async function createMessage(channelId: string, userId: string, body: string): Promise<ChatMessage> {
  const saved = await prisma.message.create({
    data: {
      channelId,
      userId,
      body,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      }
    }
  })

  return {
    id: saved.id,
    channelId: saved.channelId,
    userId: saved.userId,
    body: saved.body,
    createdAt: saved.createdAt.toISOString(),
    author: {
      id: saved.user?.id ?? saved.userId,
      name: saved.user?.name ?? null,
      image: saved.user?.image ?? null,
    },
  }
}

export async function deleteMessage(messageId: string, userId: string, isAdmin = false) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { userId: true }
  })

  if (!message) {
    throw new Error('Message not found')
  }

  if (message.userId !== userId && !isAdmin) {
    throw new Error('Unauthorized')
  }

  return await prisma.message.delete({
    where: { id: messageId }
  })
}

export async function getActiveUsers() {
  return await prisma.user.findMany({
    where: {
      role: { in: ['member', 'editor', 'admin'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true
    },
    take: 20
  })
}

export function formatMessageDate(date: Date | string | number) {
  return formatRelative(date)
}

export function formatMessageTime(date: Date | string | number) {
  return formatDate(date, 'p')
}
