import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedContent() {
  console.log('📄 Seeding content...')

  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'editor'] } }
  })

  if (users.length === 0) {
    console.log('No admin/editor users found. Skipping content seeding.')
    return
  }

  const admin = users.find(u => u.role === 'admin') || users[0]

  // Create sample content
  const contentItems = [
    {
      slug: 'bitcoin-q4-2024-analysis',
      kind: 'research',
      title: 'Bitcoin Market Analysis - Q4 2024 Outlook',
      excerpt: 'Our expert team analyzes current Bitcoin market dynamics and provides insights into price trends, adoption patterns, and upcoming catalysts.',
      body: `# Bitcoin Market Analysis - Q4 2024 Outlook

## Executive Summary

The Bitcoin market continues to show resilience amid macroeconomic uncertainty...

## Key Findings

- **Institutional Adoption**: Growing corporate treasury allocations
- **Regulatory Clarity**: Positive developments in key jurisdictions  
- **Technical Analysis**: Bullish patterns emerging on weekly charts

## Market Outlook

Our analysis suggests...`,
      publishedAt: new Date(),
      locked: false,
      minTier: null,
      tags: JSON.stringify(['bitcoin', 'research', 'analysis', 'q4-2024'])
    },
    {
      slug: 'ethereum-pos-transition',
      kind: 'research',
      title: 'Ethereum PoS Transition Analysis',
      excerpt: 'Deep dive into Ethereum\'s transition to Proof of Stake and its implications for the ecosystem.',
      body: `# Ethereum PoS Transition Analysis

## Overview

Ethereum's transition to Proof of Stake represents a fundamental shift...

## Key Metrics

- **Energy Consumption**: 99.95% reduction
- **Validator Economics**: New staking rewards structure
- **Network Security**: Enhanced through economic incentives

## Future Implications

The transition opens new possibilities...`,
      publishedAt: new Date(),
      locked: false,
      minTier: null,
      tags: JSON.stringify(['ethereum', 'pos', 'staking', 'analysis'])
    },
    {
      slug: 'defi-risk-management',
      kind: 'resource',
      title: 'DeFi Risk Management Guide',
      excerpt: 'Comprehensive guide to managing risks in decentralized finance protocols.',
      body: `# DeFi Risk Management Guide

## Introduction

Decentralized Finance offers unprecedented opportunities but also unique risks...

## Risk Categories

### Smart Contract Risk
- Code vulnerabilities
- Upgrade mechanisms
- Governance attacks

### Liquidity Risk
- Impermanent loss
- Slippage considerations
- Market depth analysis

## Best Practices

1. **Diversification**: Spread exposure across protocols
2. **Due Diligence**: Research before investing
3. **Position Sizing**: Never risk more than you can afford to lose`,
      publishedAt: new Date(),
      locked: false,
      minTier: null,
      tags: JSON.stringify(['defi', 'risk', 'management', 'guide'])
    }
  ]

  for (const content of contentItems) {
    await prisma.content.upsert({
      where: { slug: content.slug },
      update: content,
      create: content
    })
  }

  console.log(`✅ Content seeded successfully`)
}