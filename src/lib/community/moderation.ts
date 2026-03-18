import { prisma } from '@/lib/prisma'

export async function isUserMuted(userId: string): Promise<boolean> {
  const moderation = await prisma.userModeration.findFirst({
    where: {
      userId,
      action: 'MUTE',
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
  })
  return !!moderation
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const moderation = await prisma.userModeration.findFirst({
    where: {
      userId,
      action: 'BAN',
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
  })
  return !!moderation
}

export async function canUserPost(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const banned = await isUserBanned(userId)
  if (banned) return { allowed: false, reason: 'You are banned from the community' }

  const muted = await isUserMuted(userId)
  if (muted) return { allowed: false, reason: 'You are muted and cannot post right now' }

  return { allowed: true }
}
