import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const SettingsSchema = z.object({
  inceptionDate: z.string().min(1),
  disclaimerText: z.string().min(1).max(2000),
  showBtcBenchmark: z.boolean(),
  showEthBenchmark: z.boolean(),
  showSimulator: z.boolean(),
  showChangeLog: z.boolean(),
  showAllocation: z.boolean()
})

export async function GET() {
  try {
    await requireRoleAPI(['admin'])
    const settings = await prisma.dashboardSetting.findUnique({
      where: { id: 'dashboard_settings' }
    })

    if (!settings) {
      return NextResponse.json({
        inceptionDate: new Date().toISOString().split('T')[0],
        disclaimerText:
          'This dashboard is for educational purposes only and does not constitute financial advice.',
        showBtcBenchmark: true,
        showEthBenchmark: true,
        showSimulator: true,
        showChangeLog: true,
        showAllocation: true
      })
    }

    return NextResponse.json({
      inceptionDate: settings.inceptionDate.toISOString().split('T')[0],
      disclaimerText: settings.disclaimerText,
      showBtcBenchmark: settings.showBtcBenchmark,
      showEthBenchmark: settings.showEthBenchmark,
      showSimulator: settings.showSimulator,
      showChangeLog: settings.showChangeLog,
      showAllocation: settings.showAllocation
    })
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = SettingsSchema.parse(body)
    const inceptionDate = new Date(`${data.inceptionDate}T00:00:00.000Z`)

    if (Number.isNaN(inceptionDate.getTime())) {
      return NextResponse.json({ error: 'Invalid inception date.' }, { status: 400 })
    }

    const settings = await prisma.dashboardSetting.upsert({
      where: { id: 'dashboard_settings' },
      update: {
        inceptionDate,
        disclaimerText: data.disclaimerText,
        showBtcBenchmark: data.showBtcBenchmark,
        showEthBenchmark: data.showEthBenchmark,
        showSimulator: data.showSimulator,
        showChangeLog: data.showChangeLog,
        showAllocation: data.showAllocation,
        updatedByUserId: user.id
      },
      create: {
        id: 'dashboard_settings',
        inceptionDate,
        disclaimerText: data.disclaimerText,
        showBtcBenchmark: data.showBtcBenchmark,
        showEthBenchmark: data.showEthBenchmark,
        showSimulator: data.showSimulator,
        showChangeLog: data.showChangeLog,
        showAllocation: data.showAllocation,
        updatedByUserId: user.id
      }
    })

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      inceptionDate: settings.inceptionDate.toISOString().split('T')[0],
      disclaimerText: settings.disclaimerText,
      showBtcBenchmark: settings.showBtcBenchmark,
      showEthBenchmark: settings.showEthBenchmark,
      showSimulator: settings.showSimulator,
      showChangeLog: settings.showChangeLog,
      showAllocation: settings.showAllocation
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
  }
}
