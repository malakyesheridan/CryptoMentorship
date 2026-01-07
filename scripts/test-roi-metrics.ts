import {
  calculateMaxDrawdown,
  calculateRoiLastNDays,
  calculateRoiSinceInception,
  runSimulation
} from '../src/lib/roi-dashboard'

const series = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-02', value: 105 },
  { date: '2024-01-03', value: 103 },
  { date: '2024-01-04', value: 110 },
  { date: '2024-01-05', value: 115 }
]

const roiSince = calculateRoiSinceInception(series)
const roiLast2 = calculateRoiLastNDays(series, 2)
const maxDrawdown = calculateMaxDrawdown(series)

if (Math.abs(roiSince - 15) > 0.01) {
  throw new Error(`ROI since inception expected 15%, got ${roiSince}`)
}

if (roiLast2 <= 0) {
  throw new Error(`ROI last 2 days should be positive, got ${roiLast2}`)
}

if (maxDrawdown >= 0) {
  throw new Error(`Max drawdown should be negative, got ${maxDrawdown}`)
}

const simulation = runSimulation(series, {
  startingCapital: 10000,
  startDate: '2024-01-01',
  includeMonthlyContributions: true,
  monthlyContribution: 500
})

if (simulation.finalBalance <= 0) {
  throw new Error('Simulation final balance should be positive.')
}

console.log('ROI metrics test passed.')
