export interface TickerItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  emoji: string
}

export const tickerData: TickerItem[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    price: 210.31,
    change: -6.89,
    changePercent: -3.21,
    emoji: '🟣'
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    price: 1012.29,
    change: 30.05,
    changePercent: 3.05,
    emoji: '🟡'
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    price: 2.8200,
    change: -0.0424,
    changePercent: -1.48,
    emoji: '⚪'
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.235589,
    change: -0.0056,
    changePercent: -2.31,
    emoji: '🐕'
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.804894,
    change: -0.0167,
    changePercent: -2.03,
    emoji: '🔵'
  },
  {
    symbol: 'TRX',
    name: 'Tron',
    price: 0.336051,
    change: -0.0045,
    changePercent: -1.32,
    emoji: '🔴'
  },
  {
    symbol: 'TON',
    name: 'The Open Network',
    price: 2.8100,
    change: 0.0216,
    changePercent: 0.77,
    emoji: '✈️'
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    price: 21.3500,
    change: -0.2946,
    changePercent: -1.36,
    emoji: '🔗'
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 43250.50,
    change: -173.02,
    changePercent: -0.40,
    emoji: '₿'
  }
]
