// Asset colors ported from sdca/sdca_dashboard.py lines 336-345
export const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#2196F3',
  SOL: '#9c27b0',
  XRP: '#009688',
  BNB: '#ff9800',
  SUI: '#4fc3f7',
  Gold: '#c9a227',
  USD: '#8a7d6b',
}

export const STRATEGY_TYPE_LABELS: Record<string, string> = {
  rotation: 'Rotation',
  buy_system: 'Buy System',
  combined: 'Combined',
}

export const UPDATE_TYPE_LABELS: Record<string, string> = {
  rotation: 'Rotation',
  sdca_buy: 'SDCA Buy',
  commentary: 'Commentary',
  rebalance: 'Rebalance',
}

export const UPDATE_TYPE_COLORS: Record<string, string> = {
  rotation: '#f7931a',
  sdca_buy: '#4a7c3f',
  commentary: '#c9a227',
  rebalance: '#2196F3',
}
