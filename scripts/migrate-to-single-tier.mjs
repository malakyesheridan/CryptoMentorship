#!/usr/bin/env node
/**
 * migrate-to-single-tier.mjs
 *
 * One-off data migration that consolidates the platform onto a single
 * unified subscription tier. All Memberships and all PortfolioDailySignal
 * rows are re-tagged to 'T2' regardless of their previous tier.
 *
 * Per product decision (2026-04-23):
 *   - Billing grandfathered (existing T1 Stripe subscriptions keep their price;
 *     their account just behaves as unified now). Stripe is not touched here.
 *   - majors/memecoins category split kept as sub-tabs within the single plan.
 *   - Historical T1 signals migrated to T2 (admin archive stays clean).
 *
 * Safe to re-run (idempotent).
 *
 *   node scripts/migrate-to-single-tier.mjs             # dry-run, reports counts
 *   node scripts/migrate-to-single-tier.mjs --apply     # actually updates rows
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`\nSingle-tier migration — ${APPLY ? 'APPLY mode' : 'DRY-RUN (pass --apply to commit)'}\n`)

  // ── Membership ──────────────────────────────────────────────
  const membershipBreakdown = await prisma.membership.groupBy({
    by: ['tier', 'status'],
    _count: { _all: true },
  })
  console.log('Membership counts before migration:')
  for (const row of membershipBreakdown) {
    console.log(`  tier=${row.tier.padEnd(4)} status=${row.status.padEnd(10)} count=${row._count._all}`)
  }

  const membershipsToMigrate = await prisma.membership.count({
    where: { tier: { not: 'T2' } },
  })
  console.log(`\n→ ${membershipsToMigrate} Membership row(s) will be re-tagged to T2`)

  // ── PortfolioDailySignal ────────────────────────────────────
  const signalBreakdown = await prisma.portfolioDailySignal.groupBy({
    by: ['tier'],
    _count: { _all: true },
  })
  console.log('\nPortfolioDailySignal counts before migration:')
  for (const row of signalBreakdown) {
    console.log(`  tier=${row.tier.padEnd(4)} count=${row._count._all}`)
  }

  const signalsToMigrate = await prisma.portfolioDailySignal.count({
    where: { tier: { not: 'T2' } },
  })
  console.log(`\n→ ${signalsToMigrate} PortfolioDailySignal row(s) will be re-tagged to T2`)

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to commit these changes.\n')
    return
  }

  // ── Apply ───────────────────────────────────────────────────
  console.log('\nApplying changes...')

  const membershipResult = await prisma.membership.updateMany({
    where: { tier: { not: 'T2' } },
    data: { tier: 'T2' },
  })
  console.log(`  ✓ Membership: ${membershipResult.count} row(s) updated`)

  const signalResult = await prisma.portfolioDailySignal.updateMany({
    where: { tier: { not: 'T2' } },
    data: { tier: 'T2' },
  })
  console.log(`  ✓ PortfolioDailySignal.tier: ${signalResult.count} row(s) updated`)

  // Legacy T1 "Growth" signals had no category — in the unified model, they
  // map to the "majors" (Market Rotation) sub-tab, which was T2's core feed
  // and the closest semantic equivalent to the old T1 rotation.
  const categoryBackfill = await prisma.portfolioDailySignal.updateMany({
    where: { category: null },
    data: { category: 'majors' },
  })
  console.log(`  ✓ PortfolioDailySignal.category backfilled to 'majors': ${categoryBackfill.count} row(s)`)

  console.log('\nDone.\n')
}

main()
  .catch((err) => {
    console.error('\nMigration failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
