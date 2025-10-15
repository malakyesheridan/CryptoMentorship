import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

const interestSchema = z.object({
  tag: z.string().min(1).max(50),
})

// GET /api/me/interests - Get user's interests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const interests = await prisma.userInterest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(interests)
  } catch (error) {
    console.error('Error fetching interests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/me/interests - Add an interest
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tag } = interestSchema.parse(body)

    // Check if interest already exists
    const existingInterest = await prisma.userInterest.findUnique({
      where: {
        userId_tag: {
          userId: session.user.id,
          tag: tag.toLowerCase(),
        }
      }
    })

    if (existingInterest) {
      return NextResponse.json({ error: 'Interest already exists' }, { status: 409 })
    }

    const interest = await prisma.userInterest.create({
      data: {
        userId: session.user.id,
        tag: tag.toLowerCase(),
      }
    })

    return NextResponse.json(interest, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating interest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/me/interests - Remove an interest
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')

    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const interest = await prisma.userInterest.findUnique({
      where: {
        userId_tag: {
          userId: session.user.id,
          tag: tag.toLowerCase(),
        }
      }
    })

    if (!interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    await prisma.userInterest.delete({
      where: { id: interest.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting interest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
