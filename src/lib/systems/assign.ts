import type { PrismaClient, Prisma } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { getActiveSystems } from '@/lib/system-registry'

type PrismaLike = PrismaClient | Prisma.TransactionClient

/**
 * Idempotently assigns every active system in the registry to the given user.
 * Returns the count of newly created assignments (skipping any the user
 * already has). Safe to call on every membership creation/upgrade.
 */
export async function assignAllActiveSystems(
  userId: string,
  options: { assignedBy?: string | null; client?: PrismaLike } = {}
): Promise<number> {
  const client: PrismaLike = options.client ?? defaultPrisma
  const activeSystems = getActiveSystems()
  if (activeSystems.length === 0) return 0

  const existing = await client.userSystemAssignment.findMany({
    where: { userId },
    select: { systemSlug: true },
  })
  const existingSlugs = new Set(existing.map((e) => e.systemSlug))

  const toCreate = activeSystems.filter((s) => !existingSlugs.has(s.slug))
  if (toCreate.length === 0) return 0

  await client.userSystemAssignment.createMany({
    data: toCreate.map((s) => ({
      userId,
      systemSlug: s.slug,
      isActive: true,
      assignedBy: options.assignedBy ?? null,
    })),
    skipDuplicates: true,
  })

  return toCreate.length
}
