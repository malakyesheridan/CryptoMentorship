import { runPortfolioRoiJob } from '../src/lib/jobs/portfolio-roi'

async function run() {
  const result = await runPortfolioRoiJob({
    includeClean: false,
    trigger: 'manual-script'
  })
  console.log(JSON.stringify({ result }, null, 2))
}

run().catch((error) => {
  console.error('Portfolio ROI job failed:', error)
  process.exitCode = 1
})
