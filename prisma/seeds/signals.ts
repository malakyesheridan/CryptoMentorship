import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedSignals() {
  console.log('📊 Seeding signals data...')

  // Get admin user for createdBy
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' }
  })

  if (!adminUser) {
    throw new Error('Admin user not found. Please seed users first.')
  }

  // Create portfolio settings
  const portfolioSettings = await prisma.portfolioSetting.create({
    data: {
      baseCapitalUsd: 10000,
      positionModel: 'risk_pct',
      slippageBps: 5,
      feeBps: 10
    }
  })

  console.log('✅ Created portfolio settings')

  // Create signal trades
  const signals = [
    // BTC Long - Closed (Winning)
    {
      slug: 'btc-long-2024-01',
      symbol: 'BTC',
      market: 'crypto:spot',
      direction: 'long',
      thesis: `# Bitcoin Long Position Analysis

## Market Context
Bitcoin has shown strong institutional adoption with multiple spot ETF approvals driving significant capital inflows. The technical analysis suggests a breakout from a long-term consolidation pattern.

## Technical Analysis
- **Entry Level**: $45,000 (key resistance turned support)
- **Stop Loss**: $42,000 (below major support zone)
- **Take Profit**: $50,000 (next major resistance level)
- **Risk/Reward**: 1:1.67

## Fundamental Catalysts
1. **Institutional Adoption**: Continued growth in corporate treasury allocations
2. **Regulatory Clarity**: Clearer regulatory framework supporting institutional participation
3. **Supply Dynamics**: Reduced selling pressure from miners post-halving
4. **Macro Environment**: Potential Fed pivot supporting risk assets

## Risk Factors
- High correlation with traditional risk assets
- Regulatory uncertainty in some jurisdictions
- Market volatility during major news events

## Position Sizing
- **Risk Percentage**: 2.5% of portfolio
- **Conviction Level**: 4/5 stars
- **Expected Hold Time**: 2-4 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Bitcoin', 'Long-term', 'Institutional']),
      entryTime: new Date('2024-01-15T10:00:00Z'),
      entryPrice: 45000,
      stopLoss: 42000,
      takeProfit: 50000,
      conviction: 4,
      riskPct: 2.5,
      status: 'closed',
      exitTime: new Date('2024-01-25T14:30:00Z'),
      exitPrice: 48000,
      notes: 'Position closed early due to profit-taking at resistance level. Strong performance with 1.0R multiple achieved.',
      createdById: adminUser.id
    },
    // ETH Short - Closed (Winning)
    {
      slug: 'eth-short-2024-02',
      symbol: 'ETH',
      market: 'crypto:spot',
      direction: 'short',
      thesis: `# Ethereum Short Position Analysis

## Market Context
Ethereum showing signs of weakness after failed breakout attempt. Technical indicators suggest potential downside continuation.

## Technical Analysis
- **Entry Level**: $3,200 (failed breakout level)
- **Stop Loss**: $3,400 (above recent high)
- **Take Profit**: $2,800 (support level)
- **Risk/Reward**: 1:2

## Fundamental Concerns
1. **Network Congestion**: High gas fees limiting adoption
2. **Competition**: Layer 2 solutions gaining traction
3. **Regulatory Pressure**: Potential SEC classification concerns
4. **Technical Debt**: Scaling challenges remain unresolved

## Risk Factors
- Strong developer ecosystem
- Institutional staking growth
- Potential protocol upgrades

## Position Sizing
- **Risk Percentage**: 1.5% of portfolio
- **Conviction Level**: 3/5 stars
- **Expected Hold Time**: 1-2 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Ethereum', 'Short-term', 'Technical']),
      entryTime: new Date('2024-02-01T09:30:00Z'),
      entryPrice: 3200,
      stopLoss: 3400,
      takeProfit: 2800,
      conviction: 3,
      riskPct: 1.5,
      status: 'closed',
      exitTime: new Date('2024-02-10T11:15:00Z'),
      exitPrice: 3100,
      notes: 'Position closed at partial profit. Market showed more resilience than expected.',
      createdById: adminUser.id
    },
    // SOL Long - Closed (Winning)
    {
      slug: 'sol-long-2024-03',
      symbol: 'SOL',
      market: 'crypto:spot',
      direction: 'long',
      thesis: `# Solana Long Position Analysis

## Market Context
Solana showing strong fundamentals with growing DeFi ecosystem and improving network stability. Technical breakout from consolidation pattern.

## Technical Analysis
- **Entry Level**: $120 (breakout from resistance)
- **Stop Loss**: $100 (below support zone)
- **Take Profit**: $150 (next resistance level)
- **Risk/Reward**: 1:1.5

## Fundamental Catalysts
1. **DeFi Growth**: Expanding ecosystem with new protocols
2. **Network Stability**: Improved uptime and performance
3. **Developer Adoption**: Growing number of projects building on Solana
4. **Institutional Interest**: Increasing corporate and VC attention

## Risk Factors
- Network congestion during high activity
- Competition from other Layer 1s
- Regulatory uncertainty
- Token distribution concerns

## Position Sizing
- **Risk Percentage**: 2.0% of portfolio
- **Conviction Level**: 4/5 stars
- **Expected Hold Time**: 2-3 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Solana', 'DeFi', 'Layer 1']),
      entryTime: new Date('2024-03-05T08:00:00Z'),
      entryPrice: 120,
      stopLoss: 100,
      takeProfit: 150,
      conviction: 4,
      riskPct: 2.0,
      status: 'closed',
      exitTime: new Date('2024-03-20T16:45:00Z'),
      exitPrice: 140,
      notes: 'Excellent performance with strong momentum continuation. Closed at 1.0R multiple.',
      createdById: adminUser.id
    },
    // AVAX Short - Closed (Winning)
    {
      slug: 'avax-short-2024-04',
      symbol: 'AVAX',
      market: 'crypto:spot',
      direction: 'short',
      thesis: `# Avalanche Short Position Analysis

## Market Context
Avalanche showing technical weakness after failed attempt to break above key resistance. Market sentiment turning bearish on Layer 1 tokens.

## Technical Analysis
- **Entry Level**: $35 (failed breakout level)
- **Stop Loss**: $38 (above resistance)
- **Take Profit**: $30 (support level)
- **Risk/Reward**: 1:1.67

## Fundamental Concerns
1. **Competition**: Intense competition from other Layer 1s
2. **Adoption Challenges**: Slower than expected ecosystem growth
3. **Token Economics**: High inflation rate concerns
4. **Market Sentiment**: Shift away from Layer 1 narratives

## Risk Factors
- Strong technical team and partnerships
- Potential ecosystem developments
- Market-wide recovery scenarios

## Position Sizing
- **Risk Percentage**: 1.8% of portfolio
- **Conviction Level**: 3/5 stars
- **Expected Hold Time**: 1-2 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Avalanche', 'Layer 1', 'Short-term']),
      entryTime: new Date('2024-04-10T11:30:00Z'),
      entryPrice: 35,
      stopLoss: 38,
      takeProfit: 30,
      conviction: 3,
      riskPct: 1.8,
      status: 'closed',
      exitTime: new Date('2024-04-25T13:20:00Z'),
      exitPrice: 32,
      notes: 'Successful short position with clean technical breakdown. Closed at 1.0R multiple.',
      createdById: adminUser.id
    },
    // MATIC Long - Closed (Losing)
    {
      slug: 'matic-long-2024-05',
      symbol: 'MATIC',
      market: 'crypto:spot',
      direction: 'long',
      thesis: `# Polygon Long Position Analysis

## Market Context
Polygon showing potential for recovery after significant decline. Technical indicators suggesting oversold conditions.

## Technical Analysis
- **Entry Level**: $0.85 (support level bounce)
- **Stop Loss**: $0.75 (below support)
- **Take Profit**: $1.00 (resistance level)
- **Risk/Reward**: 1:1.5

## Fundamental Catalysts
1. **Ecosystem Growth**: Continued development on Polygon
2. **Partnerships**: Major enterprise partnerships
3. **Technical Improvements**: Ongoing protocol upgrades
4. **Oversold Conditions**: Significant price decline creating opportunity

## Risk Factors
- Competition from other scaling solutions
- Regulatory concerns
- Market-wide risk-off sentiment
- Token economics questions

## Position Sizing
- **Risk Percentage**: 1.0% of portfolio
- **Conviction Level**: 2/5 stars
- **Expected Hold Time**: 1-2 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Polygon', 'Scaling', 'Recovery']),
      entryTime: new Date('2024-05-01T09:15:00Z'),
      entryPrice: 0.85,
      stopLoss: 0.75,
      takeProfit: 1.00,
      conviction: 2,
      riskPct: 1.0,
      status: 'closed',
      exitTime: new Date('2024-05-15T10:30:00Z'),
      exitPrice: 0.78,
      notes: 'Position hit stop loss due to continued market weakness. Lesson learned about market timing.',
      createdById: adminUser.id
    },
    // LINK Long - Closed (Winning)
    {
      slug: 'link-long-2024-06',
      symbol: 'LINK',
      market: 'crypto:spot',
      direction: 'long',
      thesis: `# Chainlink Long Position Analysis

## Market Context
Chainlink showing strong fundamentals with growing oracle adoption and new product launches. Technical breakout from long-term consolidation.

## Technical Analysis
- **Entry Level**: $15.50 (breakout from resistance)
- **Stop Loss**: $14.00 (below support)
- **Take Profit**: $18.00 (next resistance)
- **Risk/Reward**: 1:1.67

## Fundamental Catalysts
1. **Oracle Adoption**: Growing number of protocols using Chainlink
2. **New Products**: CCIP and other infrastructure products
3. **Enterprise Partnerships**: Major corporate integrations
4. **Market Leadership**: Dominant position in oracle space

## Risk Factors
- Competition from other oracle solutions
- Centralization concerns
- Market volatility
- Regulatory risks

## Position Sizing
- **Risk Percentage**: 2.2% of portfolio
- **Conviction Level**: 4/5 stars
- **Expected Hold Time**: 2-4 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Chainlink', 'Oracle', 'Infrastructure']),
      entryTime: new Date('2024-06-01T10:00:00Z'),
      entryPrice: 15.50,
      stopLoss: 14.00,
      takeProfit: 18.00,
      conviction: 4,
      riskPct: 2.2,
      status: 'closed',
      exitTime: new Date('2024-06-15T14:15:00Z'),
      exitPrice: 16.80,
      notes: 'Strong performance with fundamental catalysts playing out as expected. Closed at 0.87R multiple.',
      createdById: adminUser.id
    },
    // UNI Long - Open
    {
      slug: 'uni-long-2024-07',
      symbol: 'UNI',
      market: 'crypto:spot',
      direction: 'long',
      thesis: `# Uniswap Long Position Analysis

## Market Context
Uniswap showing strong fundamentals with growing trading volume and new protocol developments. Technical setup suggests potential breakout.

## Technical Analysis
- **Entry Level**: $8.50 (support level)
- **Stop Loss**: $7.50 (below support)
- **Take Profit**: $10.50 (resistance level)
- **Risk/Reward**: 1:2

## Fundamental Catalysts
1. **Trading Volume**: Consistently high DEX volume
2. **Protocol Development**: New features and improvements
3. **Fee Revenue**: Growing protocol revenue
4. **Market Share**: Dominant position in DEX space

## Risk Factors
- Competition from other DEXs
- Regulatory concerns
- Market volatility
- Token economics

## Position Sizing
- **Risk Percentage**: 1.8% of portfolio
- **Conviction Level**: 3/5 stars
- **Expected Hold Time**: 2-3 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Uniswap', 'DEX', 'DeFi']),
      entryTime: new Date('2024-07-01T09:30:00Z'),
      entryPrice: 8.50,
      stopLoss: 7.50,
      takeProfit: 10.50,
      conviction: 3,
      riskPct: 1.8,
      status: 'open',
      createdById: adminUser.id
    },
    // AAVE Long - Open
    {
      slug: 'aave-long-2024-08',
      symbol: 'AAVE',
      market: 'crypto:spot',
      direction: 'long',
      thesis: `# Aave Long Position Analysis

## Market Context
Aave showing strong fundamentals with growing TVL and new product launches. Technical indicators suggesting potential upside.

## Technical Analysis
- **Entry Level**: $95.00 (support level)
- **Stop Loss**: $85.00 (below support)
- **Take Profit**: $115.00 (resistance level)
- **Risk/Reward**: 1:2

## Fundamental Catalysts
1. **TVL Growth**: Consistently high total value locked
2. **New Products**: GHO stablecoin and other innovations
3. **Market Leadership**: Dominant position in lending space
4. **Revenue Growth**: Strong protocol revenue

## Risk Factors
- Competition from other lending protocols
- Regulatory concerns
- Market volatility
- Smart contract risks

## Position Sizing
- **Risk Percentage**: 2.0% of portfolio
- **Conviction Level**: 4/5 stars
- **Expected Hold Time**: 2-4 weeks

*This analysis is for educational purposes only and not financial advice.*`,
      tags: JSON.stringify(['Aave', 'Lending', 'DeFi']),
      entryTime: new Date('2024-08-01T10:15:00Z'),
      entryPrice: 95.00,
      stopLoss: 85.00,
      takeProfit: 115.00,
      conviction: 4,
      riskPct: 2.0,
      status: 'open',
      createdById: adminUser.id
    }
  ]

  // Create all signals
  for (const signal of signals) {
    const slug = `${signal.symbol.toLowerCase()}-${signal.direction.toLowerCase()}-${signal.entryTime.getTime()}`
    await prisma.signalTrade.upsert({
      where: {
        slug: slug
      },
      update: {
        ...signal,
        slug: slug,
        createdAt: signal.entryTime,
        updatedAt: signal.exitTime || signal.entryTime,
      },
      create: {
        ...signal,
        slug: slug,
        createdAt: signal.entryTime,
        updatedAt: signal.exitTime || signal.entryTime,
      }
    })
  }

  console.log(`✅ Created ${signals.length} signal trades`)
  console.log(`✅ Created portfolio settings`)
}
