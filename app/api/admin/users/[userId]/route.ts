import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET /api/admin/users/[userId] - Get user profile data
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { user: adminUser } = await requireRoleAPI(['admin'])
    
    const userId = params.userId
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            messages: true,
            enrollments: true,
            certificates: true,
            signalTrades: true,
            portfolioDailySignals: true,
            viewEvents: true,
            bookmarks: true,
            questions: true,
            rsvps: true,
          }
        }
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Get learning stats
    const [
      completedEnrollments,
      totalLessonsCompleted,
      totalTimeSpent,
      recentActivity
    ] = await Promise.all([
      prisma.enrollment.count({
        where: { userId, completedAt: { not: null } }
      }),
      prisma.lessonProgress.count({
        where: { userId, completedAt: { not: null } }
      }),
      prisma.lessonProgress.aggregate({
        where: { userId },
        _sum: { timeSpentMs: true }
      }),
      prisma.lessonProgress.findMany({
        where: { userId },
        include: {
          lesson: {
            select: {
              title: true,
              track: {
                select: { title: true, slug: true }
              }
            }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: 5
      })
    ])
    
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        profileCompleted: user.profileCompleted,
        onboardingCompleted: user.onboardingCompleted,
      },
      membership: user.memberships[0] || null,
      stats: {
        messages: user._count.messages,
        enrollments: user._count.enrollments,
        completedEnrollments,
        certificates: user._count.certificates,
        signalTrades: user._count.signalTrades,
        portfolioDailySignals: user._count.portfolioDailySignals,
        viewEvents: user._count.viewEvents,
        bookmarks: user._count.bookmarks,
        questions: user._count.questions,
        rsvps: user._count.rsvps,
        totalLessonsCompleted,
        totalTimeSpent: totalTimeSpent._sum.timeSpentMs || 0,
      },
      recentActivity
    })
  } catch (error) {
    logger.error(
      'Error fetching user profile',
      error instanceof Error ? error : new Error(String(error)),
      { userId: params.userId }
    )
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/[userId] - Update user role and status
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { user: adminUser } = await requireRoleAPI(['admin'])
    
    const userId = params.userId
    const body = await request.json()
    const { role, isActive } = body
    
    // Prevent changing your own role
    if (userId === adminUser.id && role && role !== adminUser.role) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }
    
    // Prevent deactivating yourself
    if (userId === adminUser.id && isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }
    
    // Get user before update for audit
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    })
    
    if (!userBefore) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Prevent changing other admins' roles (only allow changing non-admin users)
    if (userBefore.role === 'admin' && role && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot change role of admin users' },
        { status: 403 }
      )
    }
    
    // Validate role
    if (role && !['guest', 'member', 'editor', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }
    
    // Update user
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updateData: any = {}
      if (role !== undefined) updateData.role = role
      if (isActive !== undefined) updateData.isActive = isActive
      
      const updated = await tx.user.update({
        where: { id: userId },
        data: updateData
      })
      
      // Log audit event
      await logAudit(
        tx,
        adminUser.id,
        'update',
        'user',
        userId,
        {
          before: {
            role: userBefore.role,
            isActive: userBefore.isActive
          },
          after: {
            role: role !== undefined ? role : userBefore.role,
            isActive: isActive !== undefined ? isActive : userBefore.isActive
          }
        }
      )
      
      return updated
    })
    
    logger.info('User updated', {
      userId,
      updatedBy: adminUser.id,
      changes: { role, isActive }
    })
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    })
  } catch (error) {
    logger.error(
      'Error updating user',
      error instanceof Error ? error : new Error(String(error)),
      { userId: params.userId }
    )
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

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

