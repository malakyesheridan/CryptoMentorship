'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { emit } from '@/lib/events'
import { logAudit } from '@/lib/audit'

const createSignalSchema = z.object({
  symbol: z.string().min(1).max(10),
  market: z.string().default('crypto:spot'),
  direction: z.enum(['long', 'short']),
  thesis: z.string().optional(),
  tags: z.array(z.string()).default([]),
  entryTime: z.string().transform(str => new Date(str)),
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  conviction: z.number().int().min(1).max(5).optional(),
  riskPct: z.number().min(0).max(100).optional(),
})

const updateSignalSchema = z.object({
  symbol: z.string().min(1).max(10).optional(),
  market: z.string().optional(),
  direction: z.enum(['long', 'short']).optional(),
  thesis: z.string().optional(),
  tags: z.array(z.string()).optional(),
  entryTime: z.string().transform(str => new Date(str)).optional(),
  entryPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  conviction: z.number().int().min(1).max(5).optional(),
  riskPct: z.number().min(0).max(100).optional(),
  status: z.enum(['open', 'closed']).optional(),
  exitTime: z.string().transform(str => new Date(str)).optional(),
  exitPrice: z.number().positive().optional(),
  notes: z.string().optional(),
})

const portfolioSettingsSchema = z.object({
  baseCapitalUsd: z.number().positive(),
  positionModel: z.enum(['risk_pct', 'fixed_fraction']),
  slippageBps: z.number().int().min(0).max(1000),
  feeBps: z.number().int().min(0).max(1000),
})

export async function createSignal(data: z.infer<typeof createSignalSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return { error: 'Unauthorized' }
    }

    const validatedData = createSignalSchema.parse(data)

    // Generate slug
    const dateStr = validatedData.entryTime.toISOString().split('T')[0]
    const slug = `${validatedData.symbol.toLowerCase()}-${validatedData.direction}-${dateStr}`

    // Wrap in transaction for atomicity
    const signal = await prisma.$transaction(async (tx) => {
      const created = await tx.signalTrade.create({
        data: {
          ...validatedData,
          tags: JSON.stringify(validatedData.tags),
          slug,
          createdById: session.user.id
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })

      // Audit log within transaction
      await logAudit(
        tx,
        session.user.id,
        'create',
        'signal',
        created.id,
        {
          symbol: created.symbol,
          direction: created.direction,
          entryPrice: Number(created.entryPrice)
        }
      )

      return created
    })

    // Emit signal published event (outside transaction - event system)
    await emit({
      type: 'signal_published',
      contentId: signal.id
    })

    return { success: true, signal }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error creating signal:', error)
    return { error: 'Internal server error' }
  }
}

export async function updateSignal(signalId: string, data: z.infer<typeof updateSignalSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return { error: 'Unauthorized' }
    }

    const validatedData = updateSignalSchema.parse(data)

    // Verify signal exists
    const existingSignal = await prisma.signalTrade.findUnique({
      where: { id: signalId }
    })

    if (!existingSignal) {
      return { error: 'Signal not found' }
    }

    // Wrap in transaction for atomicity
    const updatedSignal = await prisma.$transaction(async (tx) => {
      const updated = await tx.signalTrade.update({
        where: { id: signalId },
        data: {
          ...validatedData,
          tags: validatedData.tags ? JSON.stringify(validatedData.tags) : undefined,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })

      // Invalidate performance cache
      await tx.perfSnapshot.deleteMany({})

      // Audit log within transaction
      await logAudit(
        tx,
        session.user.id,
        'update',
        'signal',
        signalId,
        {
          symbol: updated.symbol,
          direction: updated.direction,
          status: updated.status,
          changes: validatedData
        }
      )

      return updated
    })

    // Emit notification if signal was closed (outside transaction - event system)
    if (validatedData.status === 'closed' && existingSignal.status === 'open') {
      await emit({
        type: 'announcement',
        title: `Signal closed: ${updatedSignal.symbol} ${updatedSignal.direction}`,
        body: `The ${updatedSignal.symbol} ${updatedSignal.direction} signal has been closed.`,
        url: `/portfolio/${updatedSignal.slug}`
      })
    }

    return { success: true, signal: updatedSignal }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error updating signal:', error)
    return { error: 'Internal server error' }
  }
}

export async function deleteSignal(signalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    // Verify signal exists
    const existingSignal = await prisma.signalTrade.findUnique({
      where: { id: signalId }
    })

    if (!existingSignal) {
      return { error: 'Signal not found' }
    }

    // Wrap in transaction for atomicity
    await prisma.$transaction(async (tx) => {
      await tx.signalTrade.delete({
        where: { id: signalId }
      })

      // Invalidate performance cache
      await tx.perfSnapshot.deleteMany({})

      // Audit log within transaction
      await logAudit(
        tx,
        session.user.id,
        'delete',
        'signal',
        signalId,
        {
          symbol: existingSignal.symbol,
          direction: existingSignal.direction
        }
      )
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting signal:', error)
    return { error: 'Internal server error' }
  }
}

export async function updatePortfolioSettings(data: z.infer<typeof portfolioSettingsSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return { error: 'Unauthorized' }
    }

    const validatedData = portfolioSettingsSchema.parse(data)

    // Wrap in transaction for atomicity
    const settings = await prisma.$transaction(async (tx) => {
      const updated = await tx.portfolioSetting.upsert({
        where: { id: 'default' },
        update: {
          baseCapitalUsd: validatedData.baseCapitalUsd,
          positionModel: validatedData.positionModel,
          slippageBps: validatedData.slippageBps,
          feeBps: validatedData.feeBps,
        },
        create: {
          id: 'default',
          baseCapitalUsd: validatedData.baseCapitalUsd,
          positionModel: validatedData.positionModel,
          slippageBps: validatedData.slippageBps,
          feeBps: validatedData.feeBps,
        }
      })

      // Invalidate performance cache
      await tx.perfSnapshot.deleteMany({})

      // Audit log within transaction
      await logAudit(
        tx,
        session.user.id,
        'update',
        'signal',
        updated.id,
        validatedData
      )

      return updated
    })

    return { 
      success: true, 
      settings: {
        baseCapitalUsd: Number(settings.baseCapitalUsd),
        positionModel: settings.positionModel,
        slippageBps: settings.slippageBps,
        feeBps: settings.feeBps
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error updating portfolio settings:', error)
    return { error: 'Internal server error' }
  }
}
