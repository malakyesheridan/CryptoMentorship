import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🧪 Testing Prisma connection...')
    console.log('Prisma client:', typeof prisma)
    console.log('Prisma video:', typeof prisma?.video)
    
    // Test basic prisma functionality
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)
    
    // Test video model access
    const videoCount = await prisma.video.count()
    console.log('Video count:', videoCount)
    
    return NextResponse.json({
      ok: true,
      message: 'Prisma connection successful',
      userCount,
      videoCount,
      prismaType: typeof prisma,
      videoType: typeof prisma?.video
    })
  } catch (error) {
    console.error('❌ Prisma test error:', error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      prismaType: typeof prisma,
      videoType: typeof prisma?.video
    }, { status: 500 })
  }
}
