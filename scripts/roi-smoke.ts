import { AsyncLocalStorage } from 'node:async_hooks'
import { encode } from 'next-auth/jwt'
import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'
import { buildPortfolioKey } from '../src/lib/portfolio/portfolio-key'

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

async function getAuthContext(): Promise<AuthContext> {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true, name: true, role: true }
  })

  const fallbackUser = await prisma.user.findFirst({
    where: { role: { in: ['member', 'editor', 'admin'] } },
    select: { id: true, email: true, name: true, role: true }
  })

  const user = adminUser ?? fallbackUser
  if (!user) {
    throw new Error('No user found to generate auth token.')
  }

  const membership = await prisma.membership.findUnique({
    where: { userId: user.id },
    select: { tier: true }
  })

  const token = await encode({
    token: {
      sub: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      role: user.role,
      membershipTier: membership?.tier ?? 'T2',
      lastRefreshed: Math.floor(Date.now() / 1000)
    },
    secret: env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60
  })

  return {
    cookie: `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`
  }
}

async function callRoiApi(handler: (request: any) => Promise<Response>, url: URL, cookie: string): Promise<SmokeResult> {
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
  const auth = await getAuthContext()
  const baseUrl = env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const results: SmokeResult[] = []
  const { GET } = await import('../app/api/roi/route')
  const handler = GET

  results.push(await callRoiApi(handler, new URL('/api/roi', baseUrl), auth.cookie))
  results.push(await callRoiApi(handler, new URL('/api/roi?portfolioKey=dashboard', baseUrl), auth.cookie))

  const latestSignal = await prisma.portfolioDailySignal.findFirst({
    orderBy: { publishedAt: 'desc' }
  })
  if (latestSignal) {
    const portfolioKey = buildPortfolioKey({
      tier: latestSignal.tier,
      category: latestSignal.category,
      riskProfile: latestSignal.riskProfile
    })
    results.push(
      await callRoiApi(
        handler,
        new URL(`/api/roi?portfolioKey=${encodeURIComponent(portfolioKey)}`, baseUrl),
        auth.cookie
      )
    )
  } else {
    results.push({
      label: `${baseUrl}/api/roi?portfolioKey=<no-signal-found>`,
      status: 0,
      body: { error: 'No portfolioDailySignal rows found.' }
    })
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
}

run()
  .catch((error) => {
    console.error('ROI smoke failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
