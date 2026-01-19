export const PRIMARY_TICKER_MAP: Record<string, string> = {
  BTC: 'BTCUSD',
  ETH: 'ETHUSD',
  SOL: 'SOLUSD',
  XRP: 'XRPUSD',
  DOGE: 'DOGEUSD',
  SUI: 'SUIUSD',
  BNB: 'BNBUSD',
  TRX: 'TRXUSD',
  LINK: 'LINKUSD',
  XAUTUSD: 'XAUTUSD',
  HYPEH: 'HYPEHUSD',
  CASH: 'CASHUSD'
}

export function normalizeAssetSymbol(symbol: string | null | undefined): string | null {
  if (!symbol) return null
  const trimmed = symbol.trim().toUpperCase()
  return trimmed.length > 0 ? trimmed : null
}

export function getPrimaryTicker(symbol: string | null | undefined): string | null {
  const normalized = normalizeAssetSymbol(symbol)
  if (!normalized) return null
  return PRIMARY_TICKER_MAP[normalized] ?? null
}
