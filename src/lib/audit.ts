import { PrismaClient, Prisma } from '@prisma/client'
import { getPrismaErrorCode, withDbRetry } from '@/lib/db/retry'

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
  | 'upload_request'
  | 'upload_complete'
  | 'upload_error'

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
  | 'learning_upload'

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
    const auditPayload = {
      actorId,
      action,
      subjectType,
      subjectId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }

    const requestId = typeof metadata?.requestId === 'string' ? metadata.requestId : undefined
    const isRootPrismaClient = '$transaction' in txOrPrisma && typeof (txOrPrisma as PrismaClient).$transaction === 'function'

    if (isRootPrismaClient && requestId) {
      await withDbRetry(
        () =>
          (txOrPrisma as PrismaClient).audit.create({
            data: auditPayload,
          }),
        {
          mode: 'idempotent-write',
          idempotencyKey: `audit:${action}:${subjectType}:${actorId}:${requestId}`,
          operationName: 'audit_create',
        }
      )
    } else {
      await txOrPrisma.audit.create({
        data: auditPayload,
      })
    }
  } catch (error) {
    const errorCode = getPrismaErrorCode(error) || (error && typeof error === 'object' && 'code' in error ? String((error as any).code) : 'unknown')
    const message = error instanceof Error ? error.message : String(error)
    console.error('Audit log failed (non-blocking)', {
      actorId,
      action,
      subjectType,
      subjectId,
      errorCode,
      message,
    })
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
