import { prisma } from '@/lib/prisma'

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'publish' 
  | 'unpublish' 
  | 'login' 
  | 'logout'
  | 'role_change'

export type AuditSubjectType = 
  | 'content' 
  | 'episode' 
  | 'user' 
  | 'message' 
  | 'channel'
  | 'question'

export interface AuditMetadata {
  [key: string]: any
}

export async function logAudit(
  actorId: string,
  action: AuditAction,
  subjectType: AuditSubjectType,
  subjectId?: string,
  metadata?: AuditMetadata
) {
  try {
    await prisma.audit.create({
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
  }
}

export async function getAuditLogs(limit = 50) {
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
