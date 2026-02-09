import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getDatabaseHost, isDbUnreachableError, DB_UNREACHABLE_MESSAGE } from '@/lib/db/errors'
import { withDbRetry, getPrismaErrorCode } from '@/lib/db/retry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 })
  }

  try {
    await withDbRetry(
      async () => {
        await prisma.$queryRaw`SELECT 1`
      },
      { mode: 'read', operationName: 'health_db_select_1' }
    )

    return NextResponse.json({
      ok: true,
      host: getDatabaseHost(),
    })
  } catch (error) {
    if (isDbUnreachableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'db_unreachable',
          message: DB_UNREACHABLE_MESSAGE,
          host: getDatabaseHost(),
        },
        { status: 503 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: 'Database health check failed.',
          host: getDatabaseHost(),
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: false,
        code: getPrismaErrorCode(error) ?? 'db_error',
        message: 'Database health check failed.',
        host: getDatabaseHost(),
      },
      { status: 500 }
    )
  }
}

