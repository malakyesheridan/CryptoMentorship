import { prisma } from '../src/lib/prisma'
import { getDatabaseHost } from '../src/lib/db/errors'

async function run() {
  const host = getDatabaseHost() ?? 'unknown'
  console.log(`[db-smoke] host=${host}`)

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('[db-smoke] SELECT 1 succeeded')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[db-smoke] SELECT 1 failed: ${message}`)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[db-smoke] unexpected failure: ${message}`)
  process.exit(1)
})

