import { PrismaClient } from '@prisma/client'
import { Decimal } from '../num'

const prisma = new PrismaClient()

export async function seedRoiDashboard() {
  console.log('dY"S Seeding ROI dashboard data...')

  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  })

  if (!admin) {
    console.log('No admin user found. Skipping ROI dashboard seed.')
    return
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setUTCDate(startDate.getUTCDate() - 60)

  const seriesData: Array<{ date: Date; model: number; btc: number; eth: number }> = []
  for (let i = 0; i <= 60; i += 1) {
    const date = new Date(startDate)
    date.setUTCDate(startDate.getUTCDate() + i)
    const model = 100 * (1 + 0.002 * i + 0.03 * Math.sin(i / 7))
    const btc = 95 * (1 + 0.0025 * i + 0.04 * Math.sin(i / 6 + 0.5))
    const eth = 90 * (1 + 0.0022 * i + 0.035 * Math.sin(i / 5 + 1.2))
    seriesData.push({ date, model, btc, eth })
  }

  for (const point of seriesData) {
    await prisma.performanceSeries.upsert({
      where: {
        seriesType_date: {
          seriesType: 'MODEL',
          date: point.date
        }
      },
      update: { value: new Decimal(point.model.toFixed(6)) },
      create: {
        seriesType: 'MODEL',
        date: point.date,
        value: new Decimal(point.model.toFixed(6))
      }
    })

    await prisma.performanceSeries.upsert({
      where: {
        seriesType_date: {
          seriesType: 'BTC',
          date: point.date
        }
      },
      update: { value: new Decimal(point.btc.toFixed(6)) },
      create: {
        seriesType: 'BTC',
        date: point.date,
        value: new Decimal(point.btc.toFixed(6))
      }
    })

    await prisma.performanceSeries.upsert({
      where: {
        seriesType_date: {
          seriesType: 'ETH',
          date: point.date
        }
      },
      update: { value: new Decimal(point.eth.toFixed(6)) },
      create: {
        seriesType: 'ETH',
        date: point.date,
        value: new Decimal(point.eth.toFixed(6))
      }
    })
  }

  await prisma.dashboardSetting.upsert({
    where: { id: 'dashboard_settings' },
    update: {
      inceptionDate: startDate,
      disclaimerText: 'This dashboard is for educational purposes only and does not constitute financial advice.',
      showBtcBenchmark: true,
      showEthBenchmark: true,
      showSimulator: true,
      showChangeLog: true,
      showAllocation: true,
      updatedByUserId: admin.id
    },
    create: {
      id: 'dashboard_settings',
      inceptionDate: startDate,
      disclaimerText: 'This dashboard is for educational purposes only and does not constitute financial advice.',
      showBtcBenchmark: true,
      showEthBenchmark: true,
      showSimulator: true,
      showChangeLog: true,
      showAllocation: true,
      updatedByUserId: admin.id
    }
  })

  await prisma.allocationSnapshot.upsert({
    where: { id: 'allocation_snapshot' },
    update: {
      asOfDate: today,
      cashWeight: new Decimal('0.15'),
      items: [
        { asset: 'BTC', weight: 0.45 },
        { asset: 'ETH', weight: 0.25 },
        { asset: 'SOL', weight: 0.15 }
      ],
      updatedByUserId: admin.id
    },
    create: {
      id: 'allocation_snapshot',
      asOfDate: today,
      cashWeight: new Decimal('0.15'),
      items: [
        { asset: 'BTC', weight: 0.45 },
        { asset: 'ETH', weight: 0.25 },
        { asset: 'SOL', weight: 0.15 }
      ],
      updatedByUserId: admin.id
    }
  })

  const changeLogEvents = [
    {
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      title: 'Reduced stable allocation',
      summary: 'Shifted 5% from stables into core positions as volatility cooled.'
    },
    {
      date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      title: 'Added to BTC',
      summary: 'Increased BTC weight on improved macro clarity.'
    },
    {
      date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000),
      title: 'ETH exposure trimmed',
      summary: 'Reduced ETH allocation after short-term overextension.'
    },
    {
      date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
      title: 'SOL position initiated',
      summary: 'Started a SOL allocation as network activity accelerated.'
    },
    {
      date: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000),
      title: 'Rebalanced cash buffer',
      summary: 'Raised cash slightly to maintain flexibility.'
    }
  ]

  for (const event of changeLogEvents) {
    const existing = await prisma.changeLogEvent.findFirst({
      where: {
        title: event.title,
        date: event.date
      }
    })
    if (existing) continue
    await prisma.changeLogEvent.create({
      data: {
        ...event,
        createdByUserId: admin.id
      }
    })
  }

  await prisma.roiDashboardSnapshot.deleteMany({})

  console.log('バ. ROI dashboard data seeded')
}
