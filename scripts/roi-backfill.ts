import { runPortfolioRoiJob } from '../src/lib/jobs/portfolio-roi'

function parseDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }
  return parsed
}

async function run() {
  const startArg = process.argv[2] || process.env.START_DATE || '2026-01-11'
  const endArg = process.argv[3] || process.env.END_DATE

  const startDate = parseDate(startArg)
  const endDate = endArg ? parseDate(endArg) : new Date()

  const result = await runPortfolioRoiJob({
    includeClean: true,
    forceStartDate: startDate,
    forceEndDate: endDate,
    trigger: 'manual-backfill'
  })

  console.log(JSON.stringify({
    startDate: startArg,
    endDate: endArg ?? endDate.toISOString().slice(0, 10),
    result
  }, null, 2))
}

run().catch((error) => {
  console.error('ROI backfill failed:', error)
  process.exitCode = 1
})
