import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const portfolioSettingsSchema = z.object({
  baseCapitalUsd: z.number().positive(),
  positionModel: z.enum(['risk_pct', 'fixed_fraction']),
  slippageBps: z.number().int().min(0).max(1000),
  feeBps: z.number().int().min(0).max(1000),
})

// GET /api/admin/signals/settings - Get portfolio settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.portfolioSetting.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        baseCapitalUsd: 10000,
        positionModel: 'risk_pct',
        slippageBps: 5,
        feeBps: 10
      })
    }

    return NextResponse.json({
      baseCapitalUsd: Number(settings.baseCapitalUsd),
      positionModel: settings.positionModel,
      slippageBps: settings.slippageBps,
      feeBps: settings.feeBps
    })
  } catch (error) {
    console.error('Error fetching portfolio settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/signals/settings - Update portfolio settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = portfolioSettingsSchema.parse(body)

    // Create or update portfolio settings
    const settings = await prisma.portfolioSetting.upsert({
      where: { id: 'default' }, // Use a single settings record
      update: {
        baseCapitalUsd: data.baseCapitalUsd,
        positionModel: data.positionModel,
        slippageBps: data.slippageBps,
        feeBps: data.feeBps,
      },
      create: {
        id: 'default',
        baseCapitalUsd: data.baseCapitalUsd,
        positionModel: data.positionModel,
        slippageBps: data.slippageBps,
        feeBps: data.feeBps,
      }
    })

    return NextResponse.json({
      baseCapitalUsd: Number(settings.baseCapitalUsd),
      positionModel: settings.positionModel,
      slippageBps: settings.slippageBps,
      feeBps: settings.feeBps
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Error updating portfolio settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
