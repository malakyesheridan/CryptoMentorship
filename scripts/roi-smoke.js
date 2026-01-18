const { AsyncLocalStorage } = require('node:async_hooks')
const { encode } = require('next-auth/jwt')
const { NextRequest } = require('next/server')
const { PrismaClient } = require('@prisma/client')

if (!globalThis.AsyncLocalStorage) {
  globalThis.AsyncLocalStorage = AsyncLocalStorage
}

const hadDatabaseUrl = !!process.env.DATABASE_URL

process.env.NODE_ENV = 'development'
process.env.VERCEL_ENV = 'development'
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET
  || 'dev-secret-key-for-local-development-only-not-for-production-use'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:5000'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres'

const prisma = hadDatabaseUrl ? new PrismaClient() : null

async function getAuthContext() {
  let user = null
  let membership = null
  if (prisma) {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true }
    })

    const fallbackUser = await prisma.user.findFirst({
      where: { role: { in: ['member', 'editor', 'admin'] } },
      select: { id: true, email: true, name: true, role: true }
    })

    user = adminUser || fallbackUser
    if (user) {
      membership = await prisma.membership.findUnique({
        where: { userId: user.id },
        select: { tier: true }
      })
    }
  }

  const effectiveUser = user || {
    id: 'roi-smoke-admin',
    email: 'roi-smoke@example.com',
    name: 'ROI Smoke',
    role: 'admin'
  }

  const token = await encode({
    token: {
      sub: effectiveUser.id,
      email: effectiveUser.email || undefined,
      name: effectiveUser.name || undefined,
      role: effectiveUser.role,
      membershipTier: (membership && membership.tier) || 'T2',
      lastRefreshed: Math.floor(Date.now() / 1000)
    },
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60
  })

  return {
    cookie: `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`,
    user: effectiveUser
  }
}

function buildPortfolioKey({ tier, category, riskProfile }) {
  const safeTier = String(tier || '').trim().toLowerCase()
  const safeCategory = String(category || 'majors').trim().toLowerCase()
  const safeRisk = String(riskProfile || '').trim().toLowerCase()
  return `${safeTier}_${safeCategory}_${safeRisk}`
}

async function callRoiApi(handler, url, cookie) {
  const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage.external')
  const { HeadersAdapter } = require('next/dist/server/web/spec-extension/adapters/headers')
  const { RequestCookies } = require('next/dist/server/web/spec-extension/cookies')
  const { RequestCookiesAdapter } = require('next/dist/server/web/spec-extension/adapters/request-cookies')

  const request = new NextRequest(url, {
    headers: { cookie }
  })
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
    label: url,
    status: response.status,
    body
  }
}

async function run() {
  const auth = await getAuthContext()
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:5000'

  const nextAuthPath = require.resolve('next-auth')
  require.cache[nextAuthPath] = {
    exports: {
      getServerSession: async () => ({
        user: {
          id: auth.user.id,
          role: auth.user.role
        }
      })
    }
  }

  const { routeModule } = require('../.next/server/app/api/roi/route.js')
  const handler = routeModule.userland.GET

  const results = []
  results.push(await callRoiApi(handler, `${baseUrl}/api/roi`, auth.cookie))
  results.push(await callRoiApi(handler, `${baseUrl}/api/roi?portfolioKey=dashboard`, auth.cookie))

  if (prisma) {
    const latestSignal = await prisma.portfolioDailySignal.findFirst({
      orderBy: { publishedAt: 'desc' }
    })
    if (latestSignal) {
      const portfolioKey = buildPortfolioKey({
        tier: latestSignal.tier,
        category: latestSignal.category,
        riskProfile: latestSignal.riskProfile
      })
      results.push(await callRoiApi(
        handler,
        `${baseUrl}/api/roi?portfolioKey=${encodeURIComponent(portfolioKey)}`,
        auth.cookie
      ))
    } else {
      results.push({
        label: `${baseUrl}/api/roi?portfolioKey=<no-signal-found>`,
        status: 0,
        body: { error: 'No portfolioDailySignal rows found.' }
      })
    }
  } else {
    results.push({
      label: `${baseUrl}/api/roi?portfolioKey=<requires-database>`,
      status: 0,
      body: { error: 'DATABASE_URL missing; unable to query latest signal.' }
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
    if (prisma) {
      await prisma.$disconnect()
    }
  })
