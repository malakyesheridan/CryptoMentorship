export const portfolioAssets = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'SUI',
  'BNB',
  'TRX',
  'HYPEH',
  'LINK',
  'XAUTUSD',
  'CASH',
] as const

export type PortfolioAsset = typeof portfolioAssets[number]

export type AllocationSplit = {
  label: 'Aggressive' | 'Semi Aggressive' | 'Conservative'
  allocations: { asset: PortfolioAsset; percent: number }[]
}

export function buildAllocationSplits(
  primaryAsset: PortfolioAsset,
  secondaryAsset: PortfolioAsset,
  tertiaryAsset: PortfolioAsset
): AllocationSplit[] {
  return [
    {
      label: 'Aggressive',
      allocations: [{ asset: primaryAsset, percent: 100 }],
    },
    {
      label: 'Semi Aggressive',
      allocations: [
        { asset: primaryAsset, percent: 80 },
        { asset: secondaryAsset, percent: 20 },
      ],
    },
    {
      label: 'Conservative',
      allocations: [
        { asset: primaryAsset, percent: 60 },
        { asset: secondaryAsset, percent: 30 },
        { asset: tertiaryAsset, percent: 10 },
      ],
    },
  ]
}

export function formatAllocationSignal(
  primaryAsset: PortfolioAsset,
  secondaryAsset: PortfolioAsset,
  tertiaryAsset: PortfolioAsset
): string {
  return JSON.stringify({
    primaryAsset,
    secondaryAsset,
    tertiaryAsset,
  })
}
