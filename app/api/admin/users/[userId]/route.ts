import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/users/[userId] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { user: adminUser } = await requireRoleAPI(['admin'])
    
    const userId = params.userId
    
    // Prevent deleting yourself
    if (userId === adminUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }
    
    // Get user details before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Prevent deleting other admins (only allow deleting non-admin users)
    // Admins can delete members, editors, and guests, but not other admins
    if (userToDelete.role === 'admin' && adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete admin users' },
        { status: 403 }
      )
    }
    
    // Delete user (cascade will handle related records)
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id: userId }
      })
      
      // Log audit event
      await logAudit(
        tx,
        adminUser.id,
        'delete',
        'user',
        userId,
        {
          email: userToDelete.email,
          name: userToDelete.name,
          role: userToDelete.role
        }
      )
    })
    
    logger.info('User deleted', {
      deletedUserId: userId,
      deletedUserEmail: userToDelete.email,
      deletedBy: adminUser.id
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    logger.error(
      'Error deleting user',
      error instanceof Error ? error : new Error(String(error)),
      { userId: params.userId }
    )
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

