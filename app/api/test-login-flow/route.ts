import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

/**
 * Diagnostic endpoint to test the login flow
 * This helps us understand what's happening step by step
 */
export async function GET(req: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  // Check 1: Environment variables
  diagnostics.checks.env = {
    NEXTAUTH_SECRET: {
      exists: !!process.env.NEXTAUTH_SECRET,
      length: process.env.NEXTAUTH_SECRET?.length || 0,
      value: process.env.NEXTAUTH_SECRET 
        ? process.env.NEXTAUTH_SECRET.substring(0, 10) + '...' 
        : 'NOT SET',
    },
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  }

  // Check 2: Try to read token from request
  const secret = process.env.NEXTAUTH_SECRET || 
    (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32 
      ? process.env.NEXTAUTH_SECRET 
      : 'dev-secret-key-for-local-development-only-not-for-production-use')
  
  try {
    const token = await getToken({ 
      req, 
      secret,
    })
    diagnostics.checks.token = {
      found: !!token,
      hasSub: !!token?.sub,
      hasEmail: !!token?.email,
      hasRole: !!token?.role,
      sub: token?.sub || null,
      email: token?.email || null,
      role: token?.role || null,
    }
  } catch (error: any) {
    diagnostics.checks.token = {
      found: false,
      error: error.message,
    }
  }

  // Check 3: Check cookies in request
  const cookies = req.cookies.getAll()
  diagnostics.checks.cookies = {
    count: cookies.length,
    names: cookies.map(c => c.name),
    authCookies: cookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('session') || 
      c.name.includes('next-auth')
    ).map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0,
      valuePreview: c.value ? c.value.substring(0, 20) + '...' : null,
    })),
  }

  // Check 4: Test user lookup
  try {
    const testEmail = 'malakye@easyflow.au'
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    })
    diagnostics.checks.user = {
      found: !!user,
      hasPasswordHash: !!user?.passwordHash,
      isActive: user?.isActive,
      role: user?.role,
    }
  } catch (error: any) {
    diagnostics.checks.user = {
      found: false,
      error: error.message,
    }
  }

  return NextResponse.json(diagnostics, { status: 200 })
}

