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

// Display-label overrides: the internal key stays stable (used by price feeds,
// signal lookups, DB records) while the UI shows the friendly name.
const ASSET_DISPLAY_LABELS: Record<string, string> = {
  XAUTUSD: 'XAUT (Gold)',
}

/**
 * Returns the user-facing label for an asset symbol. Falls back to the raw
 * symbol for assets without a display override.
 */
export function getAssetDisplayLabel(asset: string): string {
  return ASSET_DISPLAY_LABELS[asset] ?? asset
}

export type AllocationAssets = {
  primaryAsset: PortfolioAsset
  secondaryAsset: PortfolioAsset
  tertiaryAsset: PortfolioAsset
}

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

export function parseAllocationAssets(
  signal: string | null | undefined
): AllocationAssets | null {
  if (!signal) return null

  try {
    const parsed = JSON.parse(signal) as Partial<AllocationAssets>
    if (parsed && typeof parsed === 'object') {
      const primaryAsset = parsed.primaryAsset
      const secondaryAsset = parsed.secondaryAsset
      const tertiaryAsset = parsed.tertiaryAsset

      if (
        primaryAsset &&
        secondaryAsset &&
        tertiaryAsset &&
        portfolioAssets.includes(primaryAsset) &&
        portfolioAssets.includes(secondaryAsset) &&
        portfolioAssets.includes(tertiaryAsset)
      ) {
        return { primaryAsset, secondaryAsset, tertiaryAsset }
      }
    }
  } catch {
    // Not JSON; fall back to string parsing
  }

  const upperSignal = signal.toUpperCase()
  const orderedAssets = portfolioAssets
    .map((asset) => ({ asset, index: upperSignal.indexOf(asset) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(({ asset }) => asset)

  if (orderedAssets.length >= 3) {
    return {
      primaryAsset: orderedAssets[0],
      secondaryAsset: orderedAssets[1],
      tertiaryAsset: orderedAssets[2],
    }
  }

  return null
}
