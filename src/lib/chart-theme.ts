'use client'

/**
 * Theme-aware chart colors.
 *
 * Recharts props like `stroke` and `fill` are passed directly to SVG
 * attributes, where CSS custom-property references (`var(--x)`) don't always
 * resolve. This hook reads the resolved CSS variable values at runtime and
 * re-reads them whenever the theme attribute on <html> flips.
 */
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/theme-provider'

export type ChartColors = {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  textStrong: string
  textMuted: string
  gold: string
  goldDim: string
  success: string
  danger: string
  positive: string // green for gains
  negative: string // red for losses
  neutral: string
}

// Dark-mode hex fallbacks used for SSR (before hydration) and for contexts
// where getComputedStyle returns an empty string.
const DARK_FALLBACK: ChartColors = {
  grid: '#2a2520',
  axis: '#8a7d6b',
  tooltipBg: '#141210',
  tooltipBorder: '#2a2520',
  tooltipText: '#f5f0e8',
  textStrong: '#f5f0e8',
  textMuted: '#8a7d6b',
  gold: '#c9a227',
  goldDim: '#a07d10',
  success: '#4a7c3f',
  danger: '#c03030',
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#8a7d6b',
}

function readColors(): ChartColors {
  if (typeof window === 'undefined') return DARK_FALLBACK

  const style = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback
  return {
    grid: get('--border-subtle', DARK_FALLBACK.grid),
    axis: get('--text-muted', DARK_FALLBACK.axis),
    tooltipBg: get('--bg-panel', DARK_FALLBACK.tooltipBg),
    tooltipBorder: get('--border-subtle', DARK_FALLBACK.tooltipBorder),
    tooltipText: get('--text-strong', DARK_FALLBACK.tooltipText),
    textStrong: get('--text-strong', DARK_FALLBACK.textStrong),
    textMuted: get('--text-muted', DARK_FALLBACK.textMuted),
    gold: get('--gold-400', DARK_FALLBACK.gold),
    goldDim: get('--gold-600', DARK_FALLBACK.goldDim),
    success: get('--success', DARK_FALLBACK.success),
    danger: get('--danger', DARK_FALLBACK.danger),
    positive: DARK_FALLBACK.positive,
    negative: DARK_FALLBACK.negative,
    neutral: get('--text-muted', DARK_FALLBACK.neutral),
  }
}

export function useChartColors(): ChartColors {
  const { resolved } = useTheme()
  const [colors, setColors] = useState<ChartColors>(() => readColors())

  useEffect(() => {
    setColors(readColors())
  }, [resolved])

  return colors
}
