import { AsyncLocalStorage } from 'node:async_hooks'
import { encode } from 'next-auth/jwt'
import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'

if (!globalThis.AsyncLocalStorage) {
  globalThis.AsyncLocalStorage = AsyncLocalStorage as any
}

type SmokeResult = {
  page: string
  context: 'logged_out' | 'expired_trial'
  status: 'rendered' | 'redirect' | 'not_found' | 'error'
  location?: string | null
  error?: string
}

type PageCall = {
  label: string
  modulePath: string
  args?: Record<string, any>
}

function parseRedirect(error: any): { location: string | null; status: string } | null {
  const digest = typeof error?.digest === 'string' ? error.digest : null
  if (digest && digest.startsWith('NEXT_REDIRECT')) {
    const parts = digest.split(';')
    return { location: parts[2] ?? null, status: parts[3] ?? '302' }
  }
  if (digest && digest.startsWith('NEXT_NOT_FOUND')) {
    return { location: null, status: '404' }
  }
  return null
}

async function buildAuthCookie(params: {
  userId: string
  email: string
  name: string | null
  role: 'guest' | 'member' | 'editor' | 'admin'
  membershipTier: string
}) {
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

  return `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`
}

async function runWithCookie(cookie: string | null, fn: () => Promise<any>) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage.external') as {
    requestAsyncStorage: { run: (store: any, fn: () => Promise<any>) => Promise<any> }
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

  const cookieHeader = cookie ? { cookie } : {}
  const headers = HeadersAdapter.seal(new Headers(cookieHeader))
  const cookies = RequestCookiesAdapter.seal(new RequestCookies(new Headers(cookieHeader)))
  const store = {
    headers,
    cookies,
    mutableCookies: cookies,
    draftMode: { isEnabled: false }
  }

  return requestAsyncStorage.run(store, fn)
}

async function runPage(page: PageCall, cookie: string | null, context: SmokeResult['context']): Promise<SmokeResult> {
  try {
    const mod = await import(page.modulePath)
    const handler = mod.default as (args?: Record<string, any>) => Promise<any>

    await runWithCookie(cookie, async () => {
      await handler(page.args ?? {})
    })

    return { page: page.label, context, status: 'rendered' }
  } catch (error) {
    const redirect = parseRedirect(error)
    if (redirect?.status === '404') {
      return { page: page.label, context, status: 'not_found', location: redirect.location }
    }
    if (redirect) {
      return { page: page.label, context, status: 'redirect', location: redirect.location }
    }
    return {
      page: page.label,
      context,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function run() {
  const results: SmokeResult[] = []

  const track = await prisma.track.findFirst({
    where: { publishedAt: { not: null } },
    select: { slug: true }
  })

  const lesson = track
    ? await prisma.lesson.findFirst({
        where: {
          track: { slug: track.slug },
          publishedAt: { not: null }
        },
        select: { slug: true }
      })
    : null

  const episode = await prisma.episode.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { slug: true }
  })

  const content = await prisma.content.findFirst({
    where: {
      OR: [
        { locked: true },
        { minTier: { not: null } }
      ]
    },
    orderBy: { publishedAt: 'desc' },
    select: { slug: true }
  })

  const pages: PageCall[] = [
    { label: '/dashboard', modulePath: '../app/(app)/dashboard/page' },
    { label: '/portfolio', modulePath: '../app/(app)/portfolio/page' },
    { label: '/portfolio/performance', modulePath: '../app/(app)/portfolio/performance/page', args: { searchParams: {} } },
    { label: '/portfolio/closed', modulePath: '../app/(app)/portfolio/closed/page' },
    { label: '/learning', modulePath: '../app/(app)/learning/page' },
    track ? { label: `/learn/${track.slug}`, modulePath: '../app/(app)/learn/[trackSlug]/page', args: { params: { trackSlug: track.slug } } } : null,
    track && lesson
      ? {
          label: `/learn/${track.slug}/lesson/${lesson.slug}`,
          modulePath: '../app/(app)/learn/[trackSlug]/lesson/[lessonSlug]/page',
          args: { params: { trackSlug: track.slug, lessonSlug: lesson.slug } }
        }
      : null,
    { label: '/crypto-compass', modulePath: '../app/(app)/crypto-compass/page', args: { searchParams: {} } },
    episode
      ? { label: `/crypto-compass/${episode.slug}`, modulePath: '../app/crypto-compass/[slug]/page', args: { params: { slug: episode.slug } } }
      : null,
    content
      ? { label: `/content/${content.slug}`, modulePath: '../app/content/[slug]/page', args: { params: { slug: content.slug } } }
      : null,
    { label: '/community', modulePath: '../app/(app)/community/layout', args: { children: 'ok' } }
  ].filter(Boolean) as PageCall[]

  const expiredEmail = `trial-smoke-expired-${Date.now()}@example.com`
  const expiredUser = await prisma.user.create({
    data: {
      email: expiredEmail,
      name: 'Expired Trial',
      role: 'guest',
      emailVerified: new Date()
    }
  })
  const expiredMembership = await prisma.membership.create({
    data: {
      userId: expiredUser.id,
      tier: 'T2',
      status: 'trial',
      currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  })

  const expiredCookie = await buildAuthCookie({
    userId: expiredUser.id,
    email: expiredUser.email,
    name: expiredUser.name,
    role: expiredUser.role as 'guest',
    membershipTier: expiredMembership.tier
  })

  for (const page of pages) {
    results.push(await runPage(page, null, 'logged_out'))
    results.push(await runPage(page, expiredCookie, 'expired_trial'))
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
}

run()
  .catch((error) => {
    console.error('page-gating-smoke failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'trial-smoke-expired-' } }
      })
    } catch (cleanupError) {
      console.error('page-gating-smoke cleanup failed:', cleanupError)
    }
    await prisma.$disconnect()
  })
