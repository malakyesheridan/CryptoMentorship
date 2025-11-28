import { PrismaClient } from '@prisma/client'
import { serializeQuizQuestions, serializeResources } from '../schemas/learning'

const prisma = new PrismaClient()

export async function seedLearningTracks() {
  console.log('🌱 Seeding learning tracks...')

  // Create Foundations of Crypto track
  const foundationsTrack = await prisma.track.upsert({
    where: { slug: 'foundations-of-crypto' },
    update: {},
    create: {
      slug: 'foundations-of-crypto',
      title: 'Foundations of Cryptocurrency Trading',
      summary: 'Master the fundamentals of cryptocurrency trading, from basic concepts to advanced strategies.',
      coverUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop',
      minTier: 'member',
      summary: `Foundations of Cryptocurrency Trading

This comprehensive track covers everything you need to know to start trading cryptocurrencies successfully.

## What You'll Learn

- Understanding blockchain technology and how cryptocurrencies work
- Key trading concepts and terminology
- Technical analysis fundamentals
- Risk management strategies
- Portfolio management techniques
- Psychology of trading

## Prerequisites

- Basic understanding of financial markets
- Willingness to learn and practice
- Access to a cryptocurrency exchange account`,
      publishedAt: new Date('2024-01-01'),
      order: 1,
    }
  })

  // Create sections for Foundations track
  const section1 = await prisma.trackSection.upsert({
    where: { id: 'foundations-section-1' },
    update: {},
    create: {
      id: 'foundations-section-1',
      trackId: foundationsTrack.id,
      title: 'Getting Started',
      summary: 'Learn the basics of cryptocurrency and blockchain technology',
      order: 1,
    }
  })

  const section2 = await prisma.trackSection.upsert({
    where: { id: 'foundations-section-2' },
    update: {},
    create: {
      id: 'foundations-section-2',
      trackId: foundationsTrack.id,
      title: 'Trading Fundamentals',
      summary: 'Master the essential concepts of cryptocurrency trading',
      order: 2,
    }
  })

  const section3 = await prisma.trackSection.upsert({
    where: { id: 'foundations-section-3' },
    update: {},
    create: {
      id: 'foundations-section-3',
      trackId: foundationsTrack.id,
      title: 'Advanced Strategies',
      summary: 'Learn advanced trading techniques and risk management',
      order: 3,
    }
  })

  // Create lessons for Foundations track
  const lessons = [
    {
      id: 'foundations-lesson-1',
      trackId: foundationsTrack.id,
      sectionId: section1.id,
      slug: 'what-is-cryptocurrency',
      title: 'What is Cryptocurrency?',
      contentMDX: `# What is Cryptocurrency?

Cryptocurrency is a digital or virtual currency that uses cryptography for security and operates independently of a central bank.

## Key Characteristics

- **Decentralized**: No single authority controls the currency
- **Digital**: Exists only in electronic form
- **Cryptographically Secure**: Uses advanced encryption techniques
- **Transparent**: All transactions are recorded on a public ledger

## Popular Cryptocurrencies

- **Bitcoin (BTC)**: The first and most well-known cryptocurrency
- **Ethereum (ETH)**: A platform for smart contracts and decentralized applications
- **Litecoin (LTC)**: Often called the silver to Bitcoin's gold
- **Ripple (XRP)**: Designed for fast, low-cost international payments

## How It Works

Cryptocurrencies use blockchain technology to maintain a distributed ledger of all transactions. This ensures:

- **Immutability**: Transactions cannot be altered once recorded
- **Transparency**: All transactions are publicly visible
- **Security**: Cryptographic signatures prevent fraud

## Benefits of Cryptocurrency

1. **Lower Transaction Fees**: Especially for international transfers
2. **Fast Transactions**: Can be processed in minutes
3. **Accessibility**: Available to anyone with internet access
4. **Privacy**: Offers more privacy than traditional banking

## Risks to Consider

- **Volatility**: Prices can fluctuate dramatically
- **Regulatory Uncertainty**: Laws are still evolving
- **Technical Complexity**: Requires understanding of technology
- **Security Risks**: Potential for loss if not properly secured`,
      durationMin: 15,
      publishedAt: new Date('2024-01-01'),
      order: 1,
    },
    {
      id: 'foundations-lesson-2',
      trackId: foundationsTrack.id,
      sectionId: section1.id,
      slug: 'blockchain-technology',
      title: 'Understanding Blockchain Technology',
      contentMDX: `# Understanding Blockchain Technology

Blockchain is the underlying technology that powers most cryptocurrencies. It's a distributed ledger that maintains a continuously growing list of records.

## What is Blockchain?

A blockchain is essentially a digital ledger of transactions that is duplicated and distributed across the entire network of computer systems on the blockchain.

## Key Components

### 1. Blocks
Each block contains:
- A list of transactions
- A timestamp
- A reference to the previous block (hash)
- A nonce (number used once)

### 2. Hash Function
A cryptographic function that converts input data into a fixed-size string of characters.

### 3. Consensus Mechanism
The process by which network participants agree on the validity of transactions.

## Types of Blockchain

### Public Blockchains
- Open to anyone
- Examples: Bitcoin, Ethereum
- Fully decentralized

### Private Blockchains
- Restricted access
- Controlled by a single organization
- More centralized

### Consortium Blockchains
- Controlled by a group of organizations
- Semi-decentralized
- Examples: R3 Corda, Hyperledger

## Consensus Mechanisms

### Proof of Work (PoW)
- Miners compete to solve complex mathematical problems
- Used by Bitcoin
- Energy-intensive but secure

### Proof of Stake (PoS)
- Validators are chosen based on the amount of cryptocurrency they hold
- More energy-efficient
- Used by Ethereum 2.0

## Benefits of Blockchain

1. **Transparency**: All transactions are visible
2. **Security**: Cryptographically secured
3. **Immutability**: Records cannot be altered
4. **Decentralization**: No single point of failure

## Use Cases Beyond Cryptocurrency

- Supply chain management
- Healthcare records
- Voting systems
- Digital identity
- Smart contracts`,
      durationMin: 20,
      publishedAt: new Date('2024-01-01'),
      order: 2,
    },
    {
      id: 'foundations-lesson-3',
      trackId: foundationsTrack.id,
      sectionId: section2.id,
      slug: 'trading-basics',
      title: 'Trading Basics',
      contentMDX: `# Trading Basics

Learn the fundamental concepts of cryptocurrency trading and how to get started.

## Types of Trading

### Spot Trading
- Buying and selling cryptocurrencies at current market prices
- Immediate settlement
- Most common type of trading

### Margin Trading
- Trading with borrowed funds
- Allows for larger positions
- Higher risk and potential reward

### Futures Trading
- Contracts to buy or sell at a future date
- Allows for hedging and speculation
- More complex than spot trading

## Trading Pairs

### Major Pairs
- BTC/USD, ETH/USD
- Most liquid and stable
- Lower spreads

### Altcoin Pairs
- BTC/ETH, ETH/LTC
- Higher volatility
- More trading opportunities

## Order Types

### Market Orders
- Execute immediately at current market price
- Fast execution
- No price guarantee

### Limit Orders
- Execute only at specified price or better
- Price control
- May not execute if price doesn't reach target

### Stop Orders
- Triggered when price reaches a certain level
- Risk management tool
- Can limit losses or lock in profits

## Key Trading Concepts

### Bid-Ask Spread
- Difference between highest bid and lowest ask
- Represents trading cost
- Lower spreads are better

### Volume
- Amount of cryptocurrency traded
- Indicates market activity
- Higher volume = more liquidity

### Market Depth
- Amount of orders at different price levels
- Shows market liquidity
- Important for large trades

## Getting Started

1. **Choose an Exchange**: Research and select a reputable platform
2. **Complete KYC**: Verify your identity
3. **Fund Your Account**: Deposit fiat or cryptocurrency
4. **Start Small**: Begin with small amounts
5. **Learn Continuously**: Keep educating yourself

## Risk Management

- Never invest more than you can afford to lose
- Use stop-loss orders
- Diversify your portfolio
- Keep emotions in check
- Have a trading plan`,
      durationMin: 25,
      publishedAt: new Date('2024-01-01'),
      order: 3,
    },
    {
      id: 'foundations-lesson-4',
      trackId: foundationsTrack.id,
      sectionId: section2.id,
      slug: 'technical-analysis',
      title: 'Technical Analysis Fundamentals',
      contentMDX: `# Technical Analysis Fundamentals

Technical analysis is the study of price movements and patterns to predict future price direction.

## Core Principles

### 1. Price Discounts Everything
All information is already reflected in the price.

### 2. Price Moves in Trends
Prices tend to move in identifiable trends.

### 3. History Repeats Itself
Price patterns tend to repeat over time.

## Chart Types

### Line Charts
- Simple price over time
- Good for overall trend identification
- Easy to read

### Candlestick Charts
- Shows open, high, low, close
- More detailed information
- Popular among traders

### Bar Charts
- Similar to candlesticks
- Different visual representation
- Less common in crypto

## Support and Resistance

### Support Levels
- Price levels where buying interest is strong
- Prices tend to bounce off support
- Can be psychological or technical

### Resistance Levels
- Price levels where selling pressure is strong
- Prices tend to fall from resistance
- Can be psychological or technical

## Trend Analysis

### Uptrend
- Higher highs and higher lows
- Bullish market sentiment
- Buy opportunities on pullbacks

### Downtrend
- Lower highs and lower lows
- Bearish market sentiment
- Sell opportunities on rallies

### Sideways Trend
- Price moves within a range
- Consolidation phase
- Wait for breakout

## Common Indicators

### Moving Averages
- Smooth out price data
- Identify trend direction
- Common periods: 20, 50, 200

### RSI (Relative Strength Index)
- Measures overbought/oversold conditions
- Range: 0-100
- Values above 70 = overbought, below 30 = oversold

### MACD (Moving Average Convergence Divergence)
- Shows relationship between two moving averages
- Identifies trend changes
- Consists of MACD line, signal line, and histogram

## Chart Patterns

### Head and Shoulders
- Reversal pattern
- Three peaks with middle highest
- Signals potential trend change

### Double Top/Bottom
- Reversal patterns
- Two peaks/troughs at similar levels
- Confirms resistance/support

### Triangles
- Continuation patterns
- Converging trend lines
- Breakout indicates direction

## Risk Management

- Use stop-loss orders
- Don't risk more than 1-2% per trade
- Keep emotions in check
- Have a clear exit strategy
- Practice with paper trading first`,
      durationMin: 30,
      publishedAt: new Date('2024-01-01'),
      order: 4,
    },
    {
      id: 'foundations-lesson-5',
      trackId: foundationsTrack.id,
      sectionId: section3.id,
      slug: 'risk-management',
      title: 'Risk Management Strategies',
      contentMDX: `# Risk Management Strategies

Effective risk management is crucial for long-term trading success.

## The 2% Rule

Never risk more than 2% of your account balance on a single trade.

### Example
- Account balance: $10,000
- Maximum risk per trade: $200
- If stop loss is 5% away, position size = $4,000

## Position Sizing

### Fixed Dollar Amount
- Risk same dollar amount per trade
- Simple to implement
- Doesn't account for volatility

### Percentage of Account
- Risk percentage of account balance
- Adjusts with account growth
- More sophisticated approach

### Volatility-Based
- Adjust position size based on volatility
- Higher volatility = smaller position
- More complex but effective

## Stop Loss Strategies

### Fixed Percentage Stop
- Set stop at fixed percentage from entry
- Simple to implement
- May not account for volatility

### ATR-Based Stop
- Use Average True Range for stop distance
- Adapts to market volatility
- More sophisticated approach

### Support/Resistance Stop
- Place stops beyond key levels
- Uses technical analysis
- Can be more effective

## Portfolio Management

### Diversification
- Don't put all eggs in one basket
- Spread risk across different assets
- Reduces overall portfolio risk

### Correlation Analysis
- Understand how assets move together
- Avoid over-concentration
- Better risk distribution

### Asset Allocation
- Determine percentage in each asset
- Rebalance periodically
- Maintain target allocation

## Risk Metrics

### Maximum Drawdown
- Largest peak-to-trough decline
- Measures worst-case scenario
- Important for risk assessment

### Sharpe Ratio
- Risk-adjusted return measure
- Higher is better
- Compares return to volatility

### Value at Risk (VaR)
- Potential loss over time period
- Statistical measure
- Helps with position sizing

## Psychological Risk Management

### Emotional Control
- Keep emotions in check
- Stick to your plan
- Don't chase losses

### Trading Journal
- Record all trades
- Analyze performance
- Learn from mistakes

### Regular Breaks
- Avoid overtrading
- Take time to reflect
- Maintain perspective

## Common Mistakes

- Risking too much per trade
- Not using stop losses
- Averaging down losses
- FOMO (Fear of Missing Out)
- Revenge trading
- Ignoring risk management rules

## Best Practices

1. Always use stop losses
2. Never risk more than you can afford
3. Keep detailed records
4. Review and adjust regularly
5. Stay disciplined
6. Learn from mistakes
7. Practice with paper trading`,
      durationMin: 35,
      publishedAt: new Date('2024-01-01'),
      order: 5,
    }
  ]

  // Create lessons
  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    })
  }

  // Create quiz for lesson 5
  const quiz = await prisma.quiz.upsert({
    where: { id: 'foundations-quiz-1' },
    update: {},
    create: {
      id: 'foundations-quiz-1',
      lessonId: 'foundations-lesson-5',
      passPct: 70,
      questions: serializeQuizQuestions([
        {
          id: 'q1',
          kind: 'mc' as const,
          prompt: 'What is the maximum percentage of your account balance you should risk on a single trade?',
          options: ['1%', '2%', '5%', '10%'],
          correctIndexes: [1]
        },
        {
          id: 'q2',
          kind: 'mc' as const,
          prompt: 'Which of the following is NOT a type of stop loss strategy?',
          options: ['Fixed percentage stop', 'ATR-based stop', 'Support/resistance stop', 'Time-based stop'],
          correctIndexes: [3]
        },
        {
          id: 'q3',
          kind: 'mc' as const,
          prompt: 'What does Maximum Drawdown measure?',
          options: ['Average return', 'Largest peak-to-trough decline', 'Volatility', 'Sharpe ratio'],
          correctIndexes: [1]
        },
        {
          id: 'q4',
          kind: 'mc' as const,
          prompt: 'Which risk management practice helps with emotional control?',
          options: ['Using stop losses', 'Keeping a trading journal', 'Diversification', 'Position sizing'],
          correctIndexes: [1]
        },
        {
          id: 'q5',
          kind: 'mc' as const,
          prompt: 'What is the primary purpose of diversification?',
          options: ['Increase returns', 'Reduce risk', 'Simplify trading', 'Lower costs'],
          correctIndexes: [1]
        }
      ])
    }
  })

  // Create Risk & Portfolio track
  const riskTrack = await prisma.track.upsert({
    where: { slug: 'risk-portfolio-management' },
    update: {},
    create: {
      slug: 'risk-portfolio-management',
      title: 'Risk & Portfolio Management',
      summary: 'Advanced strategies for managing risk and building a diversified cryptocurrency portfolio.',
      coverUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
      minTier: 'member',
      summary: `Risk & Portfolio Management

Learn advanced techniques for managing risk and building a robust cryptocurrency portfolio.

## What You'll Learn

- Advanced risk management techniques
- Portfolio construction strategies
- Position sizing methodologies
- Correlation analysis
- Performance measurement
- Rebalancing strategies

## Prerequisites

- Completion of Foundations track recommended
- Basic understanding of trading concepts
- Experience with cryptocurrency markets`,
      publishedAt: new Date('2024-01-15'),
      order: 2,
    }
  })

  // Create sections for Risk track
  const riskSection1 = await prisma.trackSection.upsert({
    where: { id: 'risk-section-1' },
    update: {},
    create: {
      id: 'risk-section-1',
      trackId: riskTrack.id,
      title: 'Advanced Risk Management',
      summary: 'Sophisticated risk management techniques for serious traders',
      order: 1,
    }
  })

  const riskSection2 = await prisma.trackSection.upsert({
    where: { id: 'risk-section-2' },
    update: {},
    create: {
      id: 'risk-section-2',
      trackId: riskTrack.id,
      title: 'Portfolio Construction',
      summary: 'Build and maintain a diversified cryptocurrency portfolio',
      order: 2,
    }
  })

  // Create lessons for Risk track
  const riskLessons = [
    {
      id: 'risk-lesson-1',
      trackId: riskTrack.id,
      sectionId: riskSection1.id,
      slug: 'position-sizing-methods',
      title: 'Advanced Position Sizing Methods',
      contentMDX: `# Advanced Position Sizing Methods

Learn sophisticated techniques for determining optimal position sizes.

## Kelly Criterion

A mathematical formula for optimal position sizing based on win rate and average win/loss ratio.

### Formula
f = (bp - q) / b

Where:
- f = fraction of capital to wager
- b = odds received on the wager
- p = probability of winning
- q = probability of losing (1-p)

### Example
- Win rate: 60%
- Average win: $200
- Average loss: $100
- Odds: 2:1
- Kelly fraction: (2 × 0.6 - 0.4) / 2 = 0.4 (40%)

## Fixed Fractional Method

Risk a fixed percentage of account balance on each trade.

### Advantages
- Simple to implement
- Automatically adjusts with account growth
- Prevents catastrophic losses

### Disadvantages
- Doesn't account for trade quality
- May be too conservative for small accounts

## Volatility-Based Sizing

Adjust position size based on asset volatility.

### Implementation
1. Calculate asset's volatility (standard deviation)
2. Adjust position size inversely to volatility
3. Higher volatility = smaller position

### Benefits
- Accounts for market conditions
- More sophisticated than fixed percentage
- Better risk-adjusted returns

## Correlation-Adjusted Sizing

Consider correlation between positions when sizing.

### Process
1. Calculate correlation matrix
2. Adjust position sizes based on correlations
3. Reduce size for highly correlated positions

## Risk Parity

Equal risk contribution from each position.

### Concept
Each position contributes equally to portfolio risk.

### Implementation
1. Calculate risk contribution of each position
2. Adjust weights to equalize risk contributions
3. Rebalance periodically

## Dynamic Sizing

Adjust position sizes based on market conditions.

### Factors to Consider
- Market volatility
- Trend strength
- Economic indicators
- Sentiment measures

## Practical Implementation

### Step 1: Define Risk Tolerance
- Maximum drawdown acceptable
- Volatility tolerance
- Time horizon

### Step 2: Choose Method
- Start with simple methods
- Gradually increase sophistication
- Backtest thoroughly

### Step 3: Monitor and Adjust
- Track performance
- Adjust parameters
- Learn from experience

## Common Mistakes

- Over-leveraging
- Ignoring correlations
- Not adjusting for volatility
- Emotional position sizing
- Lack of consistency

## Best Practices

1. Start conservative
2. Use multiple methods
3. Backtest thoroughly
4. Monitor performance
5. Adjust gradually
6. Keep detailed records
7. Stay disciplined`,
      durationMin: 40,
      publishedAt: new Date('2024-01-15'),
      order: 1,
    },
    {
      id: 'risk-lesson-2',
      trackId: riskTrack.id,
      sectionId: riskSection1.id,
      slug: 'correlation-analysis',
      title: 'Correlation Analysis',
      contentMDX: `# Correlation Analysis

Understand how different cryptocurrencies move together and use this knowledge for better portfolio management.

## What is Correlation?

Correlation measures the degree to which two assets move together.

### Correlation Coefficient
- Range: -1 to +1
- +1: Perfect positive correlation
- -1: Perfect negative correlation
- 0: No correlation

## Types of Correlation

### Positive Correlation
- Assets move in same direction
- Example: BTC and ETH often move together
- Reduces diversification benefits

### Negative Correlation
- Assets move in opposite directions
- Example: BTC and stablecoins
- Enhances diversification

### Zero Correlation
- No relationship between movements
- Ideal for diversification
- Rare in practice

## Calculating Correlation

### Pearson Correlation
Most common method for calculating correlation.

### Formula
r = Σ[(Xi - X̄)(Yi - Ȳ)] / √[Σ(Xi - X̄)² × Σ(Yi - Ȳ)²]

### Interpretation
- 0.7 to 1.0: Strong positive correlation
- 0.3 to 0.7: Moderate positive correlation
- -0.3 to 0.3: Weak correlation
- -0.7 to -0.3: Moderate negative correlation
- -1.0 to -0.7: Strong negative correlation

## Correlation in Cryptocurrency Markets

### High Correlation Periods
- Market crashes
- Major news events
- Regulatory announcements
- During bull markets

### Low Correlation Periods
- Market consolidation
- Individual project developments
- During bear markets

## Portfolio Implications

### Diversification Benefits
- Lower correlation = better diversification
- Reduces overall portfolio risk
- Improves risk-adjusted returns

### Concentration Risk
- High correlation = concentration risk
- Similar to holding single asset
- Reduces diversification benefits

## Practical Applications

### Portfolio Construction
1. Calculate correlation matrix
2. Identify low-correlation assets
3. Allocate based on correlations
4. Monitor correlations over time

### Risk Management
1. Adjust position sizes based on correlations
2. Reduce size for highly correlated positions
3. Increase size for low-correlation positions

### Rebalancing
1. Monitor correlation changes
2. Rebalance when correlations change significantly
3. Adjust allocation accordingly

## Tools and Resources

### Excel/Google Sheets
- CORREL function
- Data analysis tools
- Custom formulas

### Python/R
- pandas library
- numpy library
- Statistical packages

### Online Tools
- TradingView
- CoinMarketCap
- CryptoCompare

## Limitations

### Correlation Changes
- Correlations are not stable
- Can change during market stress
- Require regular monitoring

### Causation vs Correlation
- Correlation doesn't imply causation
- May be spurious relationships
- Need to understand underlying factors

## Best Practices

1. Calculate correlations regularly
2. Use multiple timeframes
3. Consider market conditions
4. Monitor changes over time
5. Don't rely solely on historical data
6. Understand limitations
7. Combine with other analysis

## Common Mistakes

- Using outdated correlations
- Ignoring market conditions
- Over-relying on historical data
- Not considering timeframes
- Misinterpreting correlation values`,
      durationMin: 35,
      publishedAt: new Date('2024-01-15'),
      order: 2,
    },
    {
      id: 'risk-lesson-3',
      trackId: riskTrack.id,
      sectionId: riskSection2.id,
      slug: 'portfolio-rebalancing',
      title: 'Portfolio Rebalancing Strategies',
      contentMDX: `# Portfolio Rebalancing Strategies

Learn when and how to rebalance your cryptocurrency portfolio for optimal performance.

## What is Rebalancing?

Rebalancing is the process of adjusting portfolio weights to maintain target allocation.

### Purpose
- Maintain risk profile
- Lock in gains
- Buy low, sell high
- Control drift

## Types of Rebalancing

### Calendar Rebalancing
- Rebalance at fixed intervals
- Monthly, quarterly, annually
- Simple to implement
- May miss opportunities

### Threshold Rebalancing
- Rebalance when weights drift beyond threshold
- 5%, 10%, 15% thresholds common
- More responsive to market movements
- Requires monitoring

### Hybrid Approach
- Combine calendar and threshold
- Best of both worlds
- More complex to implement

## Rebalancing Triggers

### Weight Drift
- Target: 40% BTC, 30% ETH, 30% Altcoins
- Actual: 50% BTC, 25% ETH, 25% Altcoins
- Trigger: 10% threshold exceeded

### Correlation Changes
- Monitor correlation matrix
- Rebalance when correlations change significantly
- Adjust allocation accordingly

### Volatility Changes
- Monitor portfolio volatility
- Rebalance when volatility exceeds target
- Adjust position sizes

## Rebalancing Methods

### Sell High, Buy Low
- Sell overweight positions
- Buy underweight positions
- Captures mean reversion

### Equal Weight
- Reset all positions to equal weight
- Simple approach
- May not be optimal

### Risk Parity
- Equalize risk contributions
- More sophisticated
- Better risk-adjusted returns

## Implementation Steps

### Step 1: Define Targets
- Set target allocation
- Define rebalancing triggers
- Choose rebalancing method

### Step 2: Monitor Portfolio
- Track current weights
- Calculate drift
- Monitor correlations

### Step 3: Execute Rebalancing
- Calculate required trades
- Execute trades
- Update records

### Step 4: Review and Adjust
- Analyze performance
- Adjust parameters
- Learn from experience

## Costs and Considerations

### Transaction Costs
- Trading fees
- Spread costs
- Slippage
- Tax implications

### Market Impact
- Large trades may move prices
- Consider execution method
- Use limit orders when possible

### Timing Considerations
- Avoid rebalancing during high volatility
- Consider market conditions
- Use dollar-cost averaging for large rebalances

## Tools and Resources

### Portfolio Management Software
- Personal Capital
- Mint
- Custom spreadsheets

### Trading Platforms
- Binance
- Coinbase Pro
- Kraken

### Analysis Tools
- Excel/Google Sheets
- Python/R
- Online calculators

## Common Mistakes

### Over-Rebalancing
- Too frequent rebalancing
- High transaction costs
- Diminished returns

### Under-Rebalancing
- Infrequent rebalancing
- Portfolio drift
- Increased risk

### Emotional Rebalancing
- Rebalancing based on emotions
- Market timing attempts
- Deviating from plan

## Best Practices

1. Set clear rebalancing rules
2. Stick to your plan
3. Consider transaction costs
4. Monitor performance
5. Adjust parameters gradually
6. Keep detailed records
7. Learn from experience

## Performance Measurement

### Before and After Analysis
- Compare performance before/after rebalancing
- Measure risk-adjusted returns
- Track transaction costs

### Benchmark Comparison
- Compare to buy-and-hold
- Measure tracking error
- Assess risk-adjusted performance

## Advanced Strategies

### Dynamic Rebalancing
- Adjust targets based on market conditions
- More sophisticated approach
- Requires market timing skills

### Volatility Targeting
- Adjust allocation based on volatility
- Higher volatility = lower allocation
- More sophisticated risk management

### Momentum-Based Rebalancing
- Favor recent winners
- Contrarian to mean reversion
- Requires trend identification skills`,
      durationMin: 45,
      publishedAt: new Date('2024-01-15'),
      order: 3,
    }
  ]

  // Create risk lessons
  for (const lesson of riskLessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    })
  }

  // Create quiz for risk lesson 3
  const riskQuiz = await prisma.quiz.upsert({
    where: { id: 'risk-quiz-1' },
    update: {},
    create: {
      id: 'risk-quiz-1',
      lessonId: 'risk-lesson-3',
      passPct: 70,
      questions: serializeQuizQuestions([
        {
          id: 'q1',
          kind: 'mc' as const,
          prompt: 'What is the primary purpose of portfolio rebalancing?',
          options: ['Increase returns', 'Maintain target allocation', 'Reduce transaction costs', 'Time the market'],
          correctIndexes: [1]
        },
        {
          id: 'q2',
          kind: 'mc' as const,
          prompt: 'Which rebalancing method is most responsive to market movements?',
          options: ['Calendar rebalancing', 'Threshold rebalancing', 'Equal weight', 'Risk parity'],
          correctIndexes: [1]
        },
        {
          id: 'q3',
          kind: 'mc' as const,
          prompt: 'What is a common threshold for triggering rebalancing?',
          options: ['1%', '5%', '15%', '25%'],
          correctIndexes: [1]
        },
        {
          id: 'q4',
          kind: 'mc' as const,
          prompt: 'Which factor should be considered when rebalancing?',
          options: ['Transaction costs', 'Market impact', 'Tax implications', 'All of the above'],
          correctIndexes: [3]
        },
        {
          id: 'q5',
          kind: 'mc' as const,
          prompt: 'What is the main risk of over-rebalancing?',
          options: ['Increased returns', 'High transaction costs', 'Better diversification', 'Lower volatility'],
          correctIndexes: [1]
        }
      ])
    }
  })

  console.log(`✅ Created ${lessons.length + riskLessons.length} lessons across 2 tracks`)
  return { foundationsTrack, riskTrack }
}
