import { PrismaClient, Prisma } from '@prisma/client'

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'publish' 
  | 'unpublish' 
  | 'login' 
  | 'logout'
  | 'role_change'
  | 'enroll'
  | 'complete'
  | 'submit'

export type AuditSubjectType = 
  | 'content' 
  | 'episode' 
  | 'user' 
  | 'message' 
  | 'channel'
  | 'question'
  | 'enrollment'
  | 'quiz'
  | 'signal'
  | 'track'
  | 'lesson'

export interface AuditMetadata {
  [key: string]: any
}

/**
 * Log an audit event (transaction-safe)
 * @param txOrPrisma - Prisma client or transaction client
 */
export async function logAudit(
  txOrPrisma: PrismaClient | Prisma.TransactionClient,
  actorId: string,
  action: AuditAction,
  subjectType: AuditSubjectType,
  subjectId?: string,
  metadata?: AuditMetadata
) {
  try {
    await txOrPrisma.audit.create({
      data: {
        actorId,
        action,
        subjectType,
        subjectId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    })
  } catch (error) {
    console.error('Failed to log audit:', error)
    // Don't throw - audit logging shouldn't break the main flow
    // But in transaction context, this will rollback the transaction
  }
}

export async function getAuditLogs(limit = 50) {
  const { prisma } = await import('@/lib/prisma')
  return await prisma.audit.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  })
}
