import { AsyncLocalStorage } from 'node:async_hooks'
import { encode } from 'next-auth/jwt'
import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'
import { hashPassword } from '../src/lib/password'
import { hasActiveSubscription } from '../src/lib/access'

if (!globalThis.AsyncLocalStorage) {
  globalThis.AsyncLocalStorage = AsyncLocalStorage as any
}

type SmokeResult = {
  label: string
  status: number
  body: unknown
}

type AuthContext = {
  cookie: string
}

async function buildAuthContext(params: {
  userId: string
  email: string
  name: string | null
  role: 'guest' | 'member' | 'editor' | 'admin'
  membershipTier: string
}): Promise<AuthContext> {
  const token = await encode({
    token: {
      sub: params.userId,
      email: params.email,
      name: params.name ?? undefined,
      role: params.role,
      membershipTier: params.membershipTier,
      lastRefreshed: Math.floor(Date.now() / 1000)
    },
    secret: env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60
  })

  return {
    cookie: `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`
  }
}

async function callApi(
  handler: (request: any) => Promise<Response>,
  url: URL,
  cookie: string
): Promise<SmokeResult> {
  const { NextRequest } = await import('next/server')
  const request = new NextRequest(url.toString(), {
    headers: { cookie }
  })

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage.external') as {
    requestAsyncStorage: { run: (store: any, fn: () => Promise<Response>) => Promise<Response> }
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { HeadersAdapter } = require('next/dist/server/web/spec-extension/adapters/headers') as {
    HeadersAdapter: { seal: (headers: Headers) => Headers }
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RequestCookies } = require('next/dist/server/web/spec-extension/cookies') as {
    RequestCookies: new (headers: Headers) => any
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RequestCookiesAdapter } = require('next/dist/server/web/spec-extension/adapters/request-cookies') as {
    RequestCookiesAdapter: { seal: (cookies: any) => any }
  }

  const headers = HeadersAdapter.seal(new Headers({ cookie }))
  const cookies = RequestCookiesAdapter.seal(new RequestCookies(new Headers({ cookie })))
  const store = {
    headers,
    cookies,
    mutableCookies: cookies,
    draftMode: { isEnabled: false }
  }

  const response = await requestAsyncStorage.run(store, () => handler(request))
  const body = await response.json()

  return {
    label: url.toString(),
    status: response.status,
    body
  }
}

async function run() {
  const baseUrl = env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const email = `trial-smoke-${Date.now()}@example.com`
  const passwordHash = await hashPassword('SmokeTest123!')

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Trial Smoke User',
      role: 'guest',
      passwordHash,
      emailVerified: new Date()
    }
  })

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      tier: 'T2',
      status: 'trial',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })

  const auth = await buildAuthContext({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'guest',
    membershipTier: membership.tier
  })

  const results: Record<string, unknown> = {
    createdUserId: user.id,
    createdMembershipId: membership.id
  }

  const initialActive = await hasActiveSubscription(user.id)
  results.initialAccessCheck = { hasActiveSubscription: initialActive }

  const { GET } = await import('../app/api/me/subscription-status/route')
  const initialApi = await callApi(GET, new URL('/api/me/subscription-status', baseUrl), auth.cookie)
  results.initialApi = initialApi

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      currentPeriodEnd: new Date(Date.now() - 60 * 60 * 1000)
    }
  })

  const expiredActive = await hasActiveSubscription(user.id)
  results.expiredAccessCheck = { hasActiveSubscription: expiredActive }

  const expiredApi = await callApi(GET, new URL('/api/me/subscription-status', baseUrl), auth.cookie)
  results.expiredApi = expiredApi

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
}

run()
  .catch((error) => {
    console.error('trial-smoke failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'trial-smoke-' } }
      })
    } catch (cleanupError) {
      console.error('trial-smoke cleanup failed:', cleanupError)
    }
    await prisma.$disconnect()
  })
