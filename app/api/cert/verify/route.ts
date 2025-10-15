import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Certificate code is required' }, { status: 400 })
    }

    const certificate = await prisma.certificate.findUnique({
      where: { code },
      include: {
        user: {
          select: { name: true, email: true },
        },
        track: {
          select: { title: true, slug: true },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Certificate not found' 
      }, { status: 404 })
    }

    // Return minimal verification data
    return NextResponse.json({
      valid: true,
      user: {
        name: certificate.user.name,
        initials: certificate.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S',
      },
      track: {
        title: certificate.track.title,
        slug: certificate.track.slug,
      },
      issuedAt: certificate.issuedAt.toISOString(),
      code: certificate.code,
    })

  } catch (error) {
    console.error('Error verifying certificate:', error)
    return NextResponse.json({
      error: 'Failed to verify certificate'
    }, { status: 500 })
  }
}
