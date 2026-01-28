import { prisma } from '../src/lib/prisma'
import { getOrCreateReferralCode, linkReferralToUser } from '../src/lib/referrals'
import { markReferralQualifiedFromPayment } from '../src/lib/affiliate'

async function main() {
  const startedAt = new Date().toISOString()
  console.log(`[affiliate-smoke] startedAt=${startedAt}`)

  const referrerEmail = `affiliate-referrer-${Date.now()}@example.com`
  const referredEmail = `affiliate-referred-${Date.now()}@example.com`

  let referrerId: string | null = null
  let referredId: string | null = null
  let referralId: string | null = null
  let batchId: string | null = null

  try {
    const referrer = await prisma.user.create({
      data: {
        email: referrerEmail,
        name: 'Affiliate Smoke Referrer',
        role: 'member'
      }
    })
    referrerId = referrer.id

    const referralCode = await getOrCreateReferralCode(referrer.id)

    const referred = await prisma.user.create({
      data: {
        email: referredEmail,
        name: 'Affiliate Smoke Referred',
        role: 'member'
      }
    })
    referredId = referred.id

    const linkResult = await linkReferralToUser(referralCode, referred.id, undefined, {
      referredEmail,
      referredName: 'Affiliate Smoke Referred',
      signedUpAt: new Date(),
      clickedAt: new Date()
    })

    if (!linkResult.success || !linkResult.referralId) {
      throw new Error(`linkReferralToUser failed: ${linkResult.error || 'unknown'}`)
    }
    referralId = linkResult.referralId

    await markReferralQualifiedFromPayment({
      userId: referred.id,
      paidAt: new Date(),
      planPriceCents: 10000,
      currency: 'usd',
      isInitial: true
    })

    const referralAfterQual = await prisma.referral.update({
      where: { id: referralId },
      data: {
        payableAt: new Date(Date.now() - 1000),
        status: 'PAYABLE'
      }
    })

    batchId = (await prisma.affiliatePayoutBatch.create({
      data: {
        referrerId: referrer.id,
        status: 'READY',
        totalAmountCents: referralAfterQual.commissionAmountCents || 0,
        currency: referralAfterQual.currency,
        dueAt: referralAfterQual.payableAt || new Date()
      }
    })).id

    await prisma.referral.update({
      where: { id: referralId },
      data: {
        payoutBatchId: batchId,
        status: 'PAID',
        paidAt: new Date(),
        paidByUserId: referrer.id
      }
    })

    const finalReferral = await prisma.referral.findUnique({
      where: { id: referralId }
    })

    console.log('[affiliate-smoke] referralId', referralId)
    console.log('[affiliate-smoke] status', finalReferral?.status)
  } finally {
    if (referralId) {
      await prisma.referral.delete({ where: { id: referralId } }).catch(() => undefined)
    }
    if (batchId) {
      await prisma.affiliatePayoutBatch.delete({ where: { id: batchId } }).catch(() => undefined)
    }
    if (referredId) {
      await prisma.user.delete({ where: { id: referredId } }).catch(() => undefined)
    }
    if (referrerId) {
      await prisma.user.delete({ where: { id: referrerId } }).catch(() => undefined)
    }
  }
}

main()
  .catch((error) => {
    console.error('affiliate-smoke failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
