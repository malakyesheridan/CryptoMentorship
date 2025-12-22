import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

type Role = 'guest' | 'member' | 'editor' | 'admin'

function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 32) {
    return 'dev-secret-key-for-local-development-only-not-for-production-use'
  }
  return secret
}

function getCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
}

export type UploadAuthResult =
  | { user: { id?: string | null; role: Role; email?: string | null } }
  | NextResponse

export async function requireUploadRole(
  req: NextRequest,
  allowedRoles: Role[]
): Promise<UploadAuthResult> {
  const token = await getToken({
    req,
    secret: getNextAuthSecret(),
    cookieName: getCookieName(),
  })

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (token.role as Role) ?? 'guest'
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return {
    user: {
      id: token.sub ?? null,
      role,
      email: token.email ?? null,
    },
  }
}
