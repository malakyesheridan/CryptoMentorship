import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHANNELS = [
  { slug: 'general', name: 'General Discussion', description: 'Community discussions and announcements for long-term investors' },
  { slug: 'research', name: 'Research Talk', description: 'Deep dive into market research, investment analysis, and fundamental analysis' },
  { slug: 'portfolio-strategy', name: 'Portfolio Strategy', description: 'Portfolio allocation, diversification strategies, and risk management for long-term investors' },
  { slug: 'market-analysis', name: 'Market Analysis', description: 'Fundamental analysis, market trends, and investment opportunities' },
];

const SEED_MESSAGES = [
  {
    id: 'welcome-general-1',
    channelSlug: 'general',
    authorEmail: 'admin@demo.com',
    body: '👋 Welcome to the community! Let us know what you are focusing on this week.',
  },
  {
    id: 'welcome-general-2',
    channelSlug: 'general',
    authorEmail: 'member@demo.com',
    body: 'Excited to dive into the new Crypto Compass report and share takeaways here.',
  },
  {
    id: 'research-kickoff-1',
    channelSlug: 'research',
    authorEmail: 'admin@demo.com',
    body: 'Just published the Bitcoin Q4 outlook. Curious to hear everyones thoughts on the ETF flows section.',
  },
  {
    id: 'research-kickoff-2',
    channelSlug: 'research',
    authorEmail: 'member@demo.com',
    body: 'The section on institutional demand was spot on—seeing similar data in Glassnode metrics.',
  },
  {
    id: 'portfolio-strategy-1',
    channelSlug: 'portfolio-strategy',
    authorEmail: 'admin@demo.com',
    body: 'Diversification question: What percentage of your crypto portfolio are you allocating to BTC vs. altcoins for long-term holding?',
  },
  {
    id: 'portfolio-strategy-2',
    channelSlug: 'portfolio-strategy',
    authorEmail: 'member@demo.com',
    body: 'I\'m at 70% BTC, 20% ETH, 10% selected altcoins. Following a risk-adjusted approach for the long term.',
  },
  {
    id: 'market-analysis-1',
    channelSlug: 'market-analysis',
    authorEmail: 'admin@demo.com',
    body: 'Fundamental analysis suggests we\'re in the early stages of a multi-year crypto adoption cycle. Network effects are accelerating.',
  },
  {
    id: 'market-analysis-2',
    channelSlug: 'market-analysis',
    authorEmail: 'member@demo.com',
    body: 'The on-chain metrics support this view. Active addresses and transaction volume trends look very positive.',
  },
];

export async function seedCommunity() {
  console.log('💬 Seeding community channels and messages...');

  const users = await prisma.user.findMany({
    where: { email: { in: Array.from(new Set(SEED_MESSAGES.map((m) => m.authorEmail))) } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.warn('⚠️ Skipping community seed: demo users missing');
    return;
  }

  // First, get all existing channel slugs that should be removed
  const validSlugs = CHANNELS.map(ch => ch.slug)
  const oldChannels = await prisma.channel.findMany({
    where: {
      slug: {
        notIn: validSlugs
      }
    }
  })

  // Delete old channels that are no longer in the list (trading/DeFi channels)
  if (oldChannels.length > 0) {
    console.log(`🗑️  Removing ${oldChannels.length} old channels: ${oldChannels.map(c => c.name).join(', ')}`)
    await prisma.channel.deleteMany({
      where: {
        slug: {
          notIn: validSlugs
        }
      }
    })
  }

  // Upsert channels (update existing or create new)
  const channels = await Promise.all(
    CHANNELS.map((ch) =>
      prisma.channel.upsert({
        where: { slug: ch.slug },
        update: ch,
        create: ch,
      }),
    ),
  );

  const channelBySlug = new Map(channels.map((c) => [c.slug, c.id]));
  const userByEmail = new Map(users.map((u) => [u.email, u.id]));

  for (const msg of SEED_MESSAGES) {
    const channelId = channelBySlug.get(msg.channelSlug);
    const userId = userByEmail.get(msg.authorEmail);
    if (!channelId || !userId) continue;

    await prisma.message.upsert({
      where: { id: msg.id },
      update: {
        body: msg.body,
        channelId,
        userId,
      },
      create: {
        id: msg.id,
        body: msg.body,
        channelId,
        userId,
      },
    });
  }

  console.log('✅ Community seeded');
}


