import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHANNELS = [
  { slug: 'general', name: 'General Discussion', description: 'General community discussions and announcements' },
  { slug: 'research', name: 'Research Talk', description: 'Deep dive into market research and analysis' },
  { slug: 'signals', name: 'Signals & Strategy', description: 'Trading signals and strategy discussions' },
  { slug: 'bitcoin', name: 'Bitcoin', description: 'Bitcoin-specific discussions and analysis' },
  { slug: 'defi', name: 'DeFi', description: 'Decentralized finance protocols and yield farming' },
  { slug: 'nft', name: 'NFTs & Web3', description: 'Non-fungible tokens and Web3 ecosystem' },
  { slug: 'macro', name: 'Crypto Compass Economics', description: 'Global economic trends and their impact on crypto' },
  { slug: 'technical-analysis', name: 'Technical Analysis', description: 'Chart analysis and trading patterns' },
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
    id: 'signals-kickoff-1',
    channelSlug: 'signals',
    authorEmail: 'admin@demo.com',
    body: 'Signal desk just closed SOL at 1R. Posting notes in the signal card now.',
  },
  {
    id: 'signals-kickoff-2',
    channelSlug: 'signals',
    authorEmail: 'member@demo.com',
    body: 'Appreciate the risk sizing breakdown—helped me stay disciplined on the trade.',
  },
  {
    id: 'bitcoin-discussion-1',
    channelSlug: 'bitcoin',
    authorEmail: 'admin@demo.com',
    body: 'Bitcoin hitting new ATHs this week. What is everyones take on the current momentum?',
  },
  {
    id: 'bitcoin-discussion-2',
    channelSlug: 'bitcoin',
    authorEmail: 'member@demo.com',
    body: 'The ETF inflows are insane. BlackRock alone added 10k+ BTC yesterday.',
  },
  {
    id: 'defi-yield-1',
    channelSlug: 'defi',
    authorEmail: 'admin@demo.com',
    body: 'Anyone farming the new Pendle pools? APYs looking attractive but want to understand the risks.',
  },
  {
    id: 'defi-yield-2',
    channelSlug: 'defi',
    authorEmail: 'member@demo.com',
    body: 'Been in Pendle for a few months. The yield is real but watch out for impermanent loss on volatile assets.',
  },
  {
    id: 'nft-trends-1',
    channelSlug: 'nft',
    authorEmail: 'admin@demo.com',
    body: 'NFT market showing signs of life again. Ordinals and Bitcoin NFTs leading the charge.',
  },
  {
    id: 'nft-trends-2',
    channelSlug: 'nft',
    authorEmail: 'member@demo.com',
    body: 'The Bitcoin Ordinals ecosystem is fascinating. Much more utility-focused than the 2021 NFT boom.',
  },
  {
    id: 'macro-fed-1',
    channelSlug: 'macro',
    authorEmail: 'admin@demo.com',
    body: 'Fed meeting next week. Rate cuts on the table could be huge for crypto adoption.',
  },
  {
    id: 'macro-fed-2',
    channelSlug: 'macro',
    authorEmail: 'member@demo.com',
    body: 'Agreed. The correlation between Fed policy and crypto has been strong lately.',
  },
  {
    id: 'ta-btc-1',
    channelSlug: 'technical-analysis',
    authorEmail: 'admin@demo.com',
    body: 'BTC breaking out of the ascending triangle. Target around $75k if this holds.',
  },
  {
    id: 'ta-btc-2',
    channelSlug: 'technical-analysis',
    authorEmail: 'member@demo.com',
    body: 'RSI showing overbought but momentum is strong. Could see a pullback before continuation.',
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


