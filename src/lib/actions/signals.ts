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

    // Create signal
    const signal = await prisma.signalTrade.create({
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

    // Emit signal published event
    await emit({
      type: 'signal_published',
      contentId: signal.id
    })

    // Audit log
    await logAudit(
      session.user.id,
      'create',
      'content',
      signal.id,
      {
        symbol: signal.symbol,
        direction: signal.direction,
        entryPrice: Number(signal.entryPrice)
      }
    )

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

    // Update signal
    const updatedSignal = await prisma.signalTrade.update({
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

    // Emit notification if signal was closed
    if (validatedData.status === 'closed' && existingSignal.status === 'open') {
      await emit({
        type: 'announcement',
        title: `Signal closed: ${updatedSignal.symbol} ${updatedSignal.direction}`,
        body: `The ${updatedSignal.symbol} ${updatedSignal.direction} signal has been closed.`,
        url: `/signals/${updatedSignal.slug}`
      })
    }

    // Audit log
    await logAudit(
      session.user.id,
      'update',
      'content',
      signalId,
      {
        symbol: updatedSignal.symbol,
        direction: updatedSignal.direction,
        status: updatedSignal.status,
        changes: validatedData
      }
    )

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

    // Delete signal
    await prisma.signalTrade.delete({
      where: { id: signalId }
    })

    // Audit log
    await logAudit(
      session.user.id,
      'delete',
      'content',
      signalId,
      {
        symbol: existingSignal.symbol,
        direction: existingSignal.direction
      }
    )

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

    // Create or update portfolio settings
    const settings = await prisma.portfolioSetting.upsert({
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

    // Audit log
    await logAudit(
      session.user.id,
      'update',
      'content',
      settings.id,
      validatedData
    )

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
