import { logger } from '@/lib/logger'

export type DailyClose = { date: string; close: number }

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY

const COINGECKO_IDS: Record<string, string | null> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  SUI: 'sui',
  BNB: 'binancecoin',
  TRX: 'tron',
  LINK: 'chainlink',
  XAUTUSD: 'tether-gold',
  HYPEH: null,
  CASH: null,
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 750

function buildRequestHeaders() {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = COINGECKO_API_KEY
  }
  return headers
}

function getProviderId(symbol: string) {
  return COINGECKO_IDS[symbol] ?? null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toUnixSeconds(date: string, endOfDay = false): number {
  const suffix = endOfDay ? 'T23:59:59.000Z' : 'T00:00:00.000Z'
  return Math.floor(new Date(`${date}${suffix}`).getTime() / 1000)
}

async function fetchWithRetry(url: string, meta: { symbol: string; providerId: string }): Promise<any> {
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt += 1
    const response = await fetch(url, { headers: buildRequestHeaders() })
    if (response.status === 429) {
      logger.warn('Price provider rate limited', {
        provider: 'coingecko',
        symbol: meta.symbol,
        providerId: meta.providerId,
        status: response.status,
        attempt
      })
      const retryAfter = response.headers.get('retry-after')
      const delayMs = retryAfter ? Number(retryAfter) * 1000 : BASE_DELAY_MS * attempt
      await sleep(delayMs)
      continue
    }
    if (response.status === 401 || response.status === 403) {
      logger.error('Price provider auth error', undefined, {
        provider: 'coingecko',
        symbol: meta.symbol,
        providerId: meta.providerId,
        status: response.status,
        hasApiKey: !!COINGECKO_API_KEY
      })
    }
    if (!response.ok) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Price provider error ${response.status}: ${response.statusText}`)
      }
      await sleep(BASE_DELAY_MS * attempt)
      continue
    }
    logger.info('Price provider response', {
      provider: 'coingecko',
      symbol: meta.symbol,
      providerId: meta.providerId,
      status: response.status
    })
    return response.json()
  }
  throw new Error('Price provider failed after retries')
}

function buildDailyCloseMap(prices: Array<[number, number]>) {
  const closes = new Map<string, number>()
  for (const [timestamp, price] of prices) {
    const date = new Date(timestamp).toISOString().slice(0, 10)
    closes.set(date, price)
  }
  return closes
}

function listDateStrings(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function logMissingDays(symbol: string, expectedDates: string[], closeMap: Map<string, number>) {
  const missing = expectedDates.filter((date) => !closeMap.has(date))
  if (missing.length > 0) {
    logger.warn('Missing daily closes from provider', {
      symbol,
      missingDays: missing.slice(0, 5),
      missingCount: missing.length
    })
  }
}

export async function getDailyCloses(
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, DailyClose[]>> {
  const results = new Map<string, DailyClose[]>()
  const expectedDates = listDateStrings(startDate, endDate)

  for (const rawSymbol of symbols) {
    const symbol = rawSymbol.trim().toUpperCase()
    if (symbol === 'CASH') {
      results.set(symbol, expectedDates.map((date) => ({ date, close: 1 })))
      continue
    }

    const providerId = getProviderId(symbol)
    if (!providerId) {
      logger.warn('No provider mapping for symbol; using flat price series', { symbol })
      results.set(symbol, expectedDates.map((date) => ({ date, close: 1 })))
      continue
    }

    const from = toUnixSeconds(startDate)
    const to = toUnixSeconds(endDate, true)
    const url = `${COINGECKO_BASE_URL}/coins/${providerId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`

    try {
      logger.info('Price provider request', {
        provider: 'coingecko',
        symbol,
        providerId,
        startDate,
        endDate,
        url
      })

      const payload = await fetchWithRetry(url, { symbol, providerId })
      const prices = Array.isArray(payload?.prices) ? payload.prices : []
      if (prices.length === 0) {
        logger.warn('Price provider returned empty prices', { symbol, providerId, startDate, endDate })
        results.set(symbol, expectedDates.map((date) => ({ date, close: 1 })))
        continue
      }
      const closeMap = buildDailyCloseMap(prices)
      logMissingDays(symbol, expectedDates, closeMap)

      const dailyCloses = expectedDates
        .filter((date) => closeMap.has(date))
        .map((date) => ({
          date,
          close: closeMap.get(date) ?? 0
        }))
      results.set(symbol, dailyCloses)
    } catch (error) {
      logger.error('Price provider request failed; using flat series', error instanceof Error ? error : new Error(String(error)), {
        symbol,
        providerId,
        startDate,
        endDate
      })
      results.set(symbol, expectedDates.map((date) => ({ date, close: 1 })))
    }
  }

  return results
}
