import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedCohorts() {
  console.log('🌱 Seeding cohorts...')

  // Get the foundations track
  const foundationsTrack = await prisma.track.findUnique({
    where: { slug: 'foundations-of-crypto' },
    include: {
      lessons: {
        where: { publishedAt: { not: null } },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!foundationsTrack) {
    console.log('⚠️ Foundations track not found, skipping cohort seeding')
    return
  }

  // Create demo cohort starting next Monday at 9 AM Australia/Sydney
  const now = new Date()
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7) // Next Monday
  nextMonday.setHours(9, 0, 0, 0) // 9 AM

  const cohort = await prisma.cohort.upsert({
    where: { slug: 'foundations-cohort-2024-q1' },
    update: {},
    create: {
      slug: 'foundations-cohort-2024-q1',
      title: 'Foundations of Crypto - Q1 2024 Cohort',
      description: 'Join our structured learning journey through cryptocurrency fundamentals. Lessons release weekly starting Monday.',
      trackId: foundationsTrack.id,
      startsAt: nextMonday,
      timezone: 'Australia/Sydney',
      visibility: 'member',
    },
  })

  console.log(`✅ Created cohort: ${cohort.title}`)

  // Create lesson releases (weekly cadence)
  const releases = []
  for (let i = 0; i < foundationsTrack.lessons.length; i++) {
    const releaseAt = new Date(nextMonday)
    releaseAt.setDate(releaseAt.getDate() + (i * 7)) // Weekly releases

    const release = await prisma.lessonRelease.upsert({
      where: {
        cohortId_lessonId: {
          cohortId: cohort.id,
          lessonId: foundationsTrack.lessons[i].id,
        },
      },
      update: {},
      create: {
        cohortId: cohort.id,
        lessonId: foundationsTrack.lessons[i].id,
        releaseAt,
      },
    })

    releases.push(release)
  }

  console.log(`✅ Created ${releases.length} lesson releases`)

  // Enroll demo users
  const demoUsers = await prisma.user.findMany({
    where: {
      email: {
        in: ['demo-member@example.com', 'demo-admin@example.com'],
      },
    },
  })

  for (const user of demoUsers) {
    await prisma.cohortEnrollment.upsert({
      where: {
        cohortId_userId: {
          cohortId: cohort.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        cohortId: cohort.id,
        userId: user.id,
        role: user.role === 'admin' ? 'coach' : 'member',
      },
    })
  }

  console.log(`✅ Enrolled ${demoUsers.length} demo users`)

  // Mark first lesson as completed for demo-member
  const demoMember = await prisma.user.findUnique({
    where: { email: 'demo-member@example.com' },
  })

  if (demoMember && foundationsTrack.lessons.length > 0) {
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: demoMember.id,
          lessonId: foundationsTrack.lessons[0].id,
        },
      },
      update: {},
      create: {
        userId: demoMember.id,
        lessonId: foundationsTrack.lessons[0].id,
        completedAt: new Date(),
        timeSpentMs: 15 * 60 * 1000, // 15 minutes
      },
    })

    console.log(`✅ Marked first lesson as completed for demo-member`)
  }

  console.log(`✅ Cohort seeding completed`)
  return cohort
}
