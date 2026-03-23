import { EmailType } from '@prisma/client'
import { prisma } from '../src/lib/prisma'
import { emit } from '../src/lib/events'
import { sendSignalEmails } from '../src/lib/jobs/send-signal-emails'

type ToggleOverrides = {
  emailEnabled?: boolean
  portfolioUpdatesEmail?: boolean
  cryptoCompassEmail?: boolean
  learningHubEmail?: boolean
  communityMentionsEmail?: boolean
  communityRepliesEmail?: boolean
}

async function setPrefs(userId: string, overrides: ToggleOverrides = {}) {
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      emailEnabled: overrides.emailEnabled ?? true,
      portfolioUpdatesEmail: overrides.portfolioUpdatesEmail ?? true,
      cryptoCompassEmail: overrides.cryptoCompassEmail ?? true,
      learningHubEmail: overrides.learningHubEmail ?? true,
      communityMentionsEmail: overrides.communityMentionsEmail ?? true,
      communityRepliesEmail: overrides.communityRepliesEmail ?? true,
      inAppEnabled: true,
    },
    create: {
      userId,
      emailEnabled: overrides.emailEnabled ?? true,
      portfolioUpdatesEmail: overrides.portfolioUpdatesEmail ?? true,
      cryptoCompassEmail: overrides.cryptoCompassEmail ?? true,
      learningHubEmail: overrides.learningHubEmail ?? true,
      communityMentionsEmail: overrides.communityMentionsEmail ?? true,
      communityRepliesEmail: overrides.communityRepliesEmail ?? true,
      inAppEnabled: true,
      digestEnabled: false,
      digestFreq: 'weekly',
      digestHourUTC: 9,
    },
  })
}

async function outboxCount(userId: string, type: EmailType) {
  return prisma.emailOutbox.count({
    where: { userId, type },
  })
}

async function expectDelta(params: {
  label: string
  userId: string
  type: EmailType
  before: number
  expectedDelta: number
}) {
  const after = await outboxCount(params.userId, params.type)
  const delta = after - params.before
  if (delta !== params.expectedDelta) {
    throw new Error(`${params.label}: expected delta ${params.expectedDelta}, got ${delta}`)
  }
  console.log(`[notifications-smoke] ${params.label}: OK (delta ${delta})`)
}

async function main() {
  const suffix = Date.now()
  const recipientEmail = `notifications-smoke-recipient-${suffix}@example.com`
  const actorEmail = `notifications-smoke-actor-${suffix}@example.com`

  const [recipient, actor] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: recipientEmail,
        name: 'recipient',
        role: 'member',
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: actorEmail,
        name: 'actor',
        role: 'member',
        emailVerified: new Date(),
      },
    }),
  ])

  try {
    await prisma.membership.createMany({
      data: [
        {
          userId: recipient.id,
          tier: 'T1',
          status: 'active',
          currentPeriodStart: new Date(),
        },
        {
          userId: actor.id,
          tier: 'T1',
          status: 'active',
          currentPeriodStart: new Date(),
        },
      ],
    })

    await setPrefs(recipient.id, {
      emailEnabled: true,
      portfolioUpdatesEmail: true,
      cryptoCompassEmail: true,
      learningHubEmail: true,
      communityMentionsEmail: true,
      communityRepliesEmail: true,
    })

    // Portfolio Updates
    const portfolioBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_PORTFOLIO_UPDATE)
    const signal = await prisma.portfolioDailySignal.create({
      data: {
        tier: 'T1',
        signal: '50% BTC / 30% ETH / 20% SOL',
        createdById: actor.id,
      },
    })
    await sendSignalEmails(signal.id)
    await expectDelta({
      label: 'portfolio updates enabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_PORTFOLIO_UPDATE,
      before: portfolioBefore,
      expectedDelta: 1,
    })

    await setPrefs(recipient.id, { emailEnabled: false, portfolioUpdatesEmail: true })
    const portfolioDisabledBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_PORTFOLIO_UPDATE)
    const signalDisabled = await prisma.portfolioDailySignal.create({
      data: {
        tier: 'T1',
        signal: '100% Cash',
        createdById: actor.id,
      },
    })
    await sendSignalEmails(signalDisabled.id)
    await expectDelta({
      label: 'portfolio updates disabled by channel',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_PORTFOLIO_UPDATE,
      before: portfolioDisabledBefore,
      expectedDelta: 0,
    })

    // Crypto Compass
    await setPrefs(recipient.id, { emailEnabled: true, cryptoCompassEmail: true })
    const compassBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_CRYPTO_COMPASS)
    const episode = await prisma.episode.create({
      data: {
        title: `Smoke Episode ${suffix}`,
        slug: `smoke-episode-${suffix}`,
        publishedAt: new Date(),
        locked: false,
      },
    })
    await emit({ type: 'episode_published', episodeId: episode.id })
    await expectDelta({
      label: 'crypto compass enabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_CRYPTO_COMPASS,
      before: compassBefore,
      expectedDelta: 1,
    })

    await setPrefs(recipient.id, { emailEnabled: true, cryptoCompassEmail: false })
    const compassDisabledBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_CRYPTO_COMPASS)
    const episodeDisabled = await prisma.episode.create({
      data: {
        title: `Smoke Episode Disabled ${suffix}`,
        slug: `smoke-episode-disabled-${suffix}`,
        publishedAt: new Date(),
        locked: false,
      },
    })
    await emit({ type: 'episode_published', episodeId: episodeDisabled.id })
    await expectDelta({
      label: 'crypto compass type disabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_CRYPTO_COMPASS,
      before: compassDisabledBefore,
      expectedDelta: 0,
    })

    // Learning Hub
    await setPrefs(recipient.id, { emailEnabled: true, learningHubEmail: true })
    const learningBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_LEARNING_HUB)
    await emit({
      type: 'learning_hub_published',
      subjectType: 'track',
      subjectId: `smoke-track-${suffix}`,
      title: 'Smoke Learning Track',
      url: '/learn/smoke-learning-track',
    })
    await expectDelta({
      label: 'learning hub enabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_LEARNING_HUB,
      before: learningBefore,
      expectedDelta: 1,
    })

    await setPrefs(recipient.id, { emailEnabled: true, learningHubEmail: false })
    const learningDisabledBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_LEARNING_HUB)
    await emit({
      type: 'learning_hub_published',
      subjectType: 'lesson',
      subjectId: `smoke-lesson-${suffix}`,
      title: 'Smoke Learning Lesson',
      url: '/learn/smoke-learning-track/lesson/smoke-lesson',
    })
    await expectDelta({
      label: 'learning hub disabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_LEARNING_HUB,
      before: learningDisabledBefore,
      expectedDelta: 0,
    })

    // Community Mention
    await setPrefs(recipient.id, { emailEnabled: true, communityMentionsEmail: true })
    const channel = await prisma.channel.create({
      data: {
        slug: `smoke-channel-${suffix}`,
        name: `smoke channel ${suffix}`,
      },
    })
    const mentionMessage = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: actor.id,
        body: `@recipient smoke mention ${suffix}`,
      },
    })
    const mentionBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_COMMUNITY_MENTION)
    await emit({
      type: 'mention',
      messageId: mentionMessage.id,
      mentionedUserIds: [recipient.id],
    })
    await expectDelta({
      label: 'community mention enabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_COMMUNITY_MENTION,
      before: mentionBefore,
      expectedDelta: 1,
    })

    await setPrefs(recipient.id, { emailEnabled: true, communityMentionsEmail: false })
    const mentionDisabledBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_COMMUNITY_MENTION)
    const mentionDisabledMessage = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: actor.id,
        body: `@recipient smoke mention disabled ${suffix}`,
      },
    })
    await emit({
      type: 'mention',
      messageId: mentionDisabledMessage.id,
      mentionedUserIds: [recipient.id],
    })
    await expectDelta({
      label: 'community mention disabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_COMMUNITY_MENTION,
      before: mentionDisabledBefore,
      expectedDelta: 0,
    })

    // Community Reply
    await setPrefs(recipient.id, { emailEnabled: true, communityRepliesEmail: true })
    const replyMessage = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: actor.id,
        body: `reply smoke ${suffix}`,
      },
    })
    const replyBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_COMMUNITY_REPLY)
    await emit({
      type: 'reply',
      messageId: replyMessage.id,
      parentAuthorId: recipient.id,
    })
    await expectDelta({
      label: 'community reply enabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_COMMUNITY_REPLY,
      before: replyBefore,
      expectedDelta: 1,
    })

    await setPrefs(recipient.id, { emailEnabled: true, communityRepliesEmail: false })
    const replyDisabledBefore = await outboxCount(recipient.id, EmailType.NOTIFICATION_COMMUNITY_REPLY)
    const replyDisabledMessage = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: actor.id,
        body: `reply smoke disabled ${suffix}`,
      },
    })
    await emit({
      type: 'reply',
      messageId: replyDisabledMessage.id,
      parentAuthorId: recipient.id,
    })
    await expectDelta({
      label: 'community reply disabled',
      userId: recipient.id,
      type: EmailType.NOTIFICATION_COMMUNITY_REPLY,
      before: replyDisabledBefore,
      expectedDelta: 0,
    })

    console.log('[notifications-smoke] OK: all notification preference checks passed')
  } finally {
    await prisma.emailOutbox.deleteMany({
      where: {
        OR: [
          { userId: recipient.id },
          { userId: actor.id },
          { toEmail: { in: [recipientEmail, actorEmail] } },
        ],
      },
    })
    await prisma.notification.deleteMany({
      where: { userId: { in: [recipient.id, actor.id] } },
    })
    await prisma.message.deleteMany({
      where: { userId: { in: [recipient.id, actor.id] } },
    })
    await prisma.channel.deleteMany({
      where: { slug: `smoke-channel-${suffix}` },
    })
    await prisma.episode.deleteMany({
      where: { slug: { startsWith: 'smoke-episode' } },
    })
    await prisma.portfolioDailySignal.deleteMany({
      where: { createdById: actor.id },
    })
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [recipient.id, actor.id] } },
    })
    await prisma.membership.deleteMany({
      where: { userId: { in: [recipient.id, actor.id] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [recipient.id, actor.id] } },
    })
  }
}

main()
  .catch((error) => {
    console.error('[notifications-smoke] FAILED', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
