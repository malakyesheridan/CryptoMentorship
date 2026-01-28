import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: { batchId: string }
}

function escapeCsv(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRoleAPI(['admin'])

    const batch = await prisma.affiliatePayoutBatch.findUnique({
      where: { id: params.batchId },
      include: {
        referrer: { select: { name: true, email: true } },
        referrals: {
          select: {
            id: true,
            status: true,
            referredName: true,
            referredEmail: true,
            signedUpAt: true,
            qualifiedAt: true,
            payableAt: true,
            paidAt: true,
            commissionAmountCents: true,
            currency: true,
            referredUser: { select: { email: true, name: true } }
          }
        }
      }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Payout batch not found' }, { status: 404 })
    }

    const header = [
      'Affiliate Name',
      'Affiliate Email',
      'Referral Id',
      'Referred Name',
      'Referred Email',
      'Status',
      'Signed Up At',
      'Qualified At',
      'Payable At',
      'Paid At',
      'Commission Amount',
      'Currency'
    ]

    const rows = batch.referrals.map((referral) => [
      batch.referrer?.name || '',
      batch.referrer?.email || '',
      referral.id,
      referral.referredName || referral.referredUser?.name || '',
      referral.referredEmail || referral.referredUser?.email || '',
      referral.status,
      referral.signedUpAt?.toISOString() || '',
      referral.qualifiedAt?.toISOString() || '',
      referral.payableAt?.toISOString() || '',
      referral.paidAt?.toISOString() || '',
      referral.commissionAmountCents !== null ? (referral.commissionAmountCents / 100).toFixed(2) : '',
      referral.currency
    ])

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')

    logger.info('Affiliate payout batch exported', { batchId: batch.id })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="affiliate-payout-${batch.id}.csv"`
      }
    })
  } catch (error) {
    logger.error(
      'Failed to export payout batch CSV',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
