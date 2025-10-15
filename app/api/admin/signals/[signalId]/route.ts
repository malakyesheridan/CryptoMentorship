import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { signalId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const signal = await prisma.signalTrade.findUnique({
      where: { id: params.signalId }
    })

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    return NextResponse.json(signal)
  } catch (error) {
    console.error('Error fetching signal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { signalId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const signal = await prisma.signalTrade.update({
      where: { id: params.signalId },
      data: {
        symbol: body.symbol,
        direction: body.direction,
        entryPrice: body.entryPrice,
        stopLoss: body.stopLoss,
        takeProfit: body.takeProfit,
        riskPct: body.riskPct,
        notes: body.notes,
        exitPrice: body.exitPrice,
        exitTime: body.exitTime ? new Date(body.exitTime) : null,
        status: body.status
      }
    })

    return NextResponse.json(signal)
  } catch (error) {
    console.error('Error updating signal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { signalId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.signalTrade.delete({
      where: { id: params.signalId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting signal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
