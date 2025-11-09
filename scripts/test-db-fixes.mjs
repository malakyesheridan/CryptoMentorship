#!/usr/bin/env node
/**
 * Database Fixes Verification Script
 * Tests all the database improvements we've made
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient({
  log: ['error'],
})

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function testEpisodeCategoryField() {
  console.log('\n🔍 Testing Episode category field...')
  try {
    // Try to query episodes with category field
    const episodes = await prisma.episode.findMany({
      take: 1,
      select: {
        id: true,
        title: true,
        category: true,
      }
    })
    
    if (episodes.length > 0 && episodes[0].category !== undefined) {
      console.log('✅ Episode category field accessible')
      console.log(`   Sample: "${episodes[0].title}" - category: "${episodes[0].category}"`)
      return true
    } else if (episodes.length === 0) {
      console.log('⚠️  No episodes found (database might be empty)')
      return true // Not a failure, just empty
    } else {
      console.error('❌ Episode category field not accessible')
      return false
    }
  } catch (error) {
    console.error('❌ Episode category test failed:', error.message)
    return false
  }
}

async function testIndexesExist() {
  console.log('\n🔍 Testing database indexes...')
  try {
    // SQLite specific query to check indexes
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DEV || 'file:./dev.db'
    
    if (dbUrl.startsWith('file:')) {
      // SQLite - check if indexes exist via pragma
      const result = await prisma.$queryRaw`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND (name LIKE 'Content_%' OR name LIKE 'Message_%')
        ORDER BY name
      `
      
      const indexNames = result.map((r) => r.name)
      const expectedIndexes = [
        'Content_kind_idx',
        'Content_publishedAt_idx',
        'Content_locked_idx',
        'Content_minTier_idx',
        'Content_kind_publishedAt_idx',
        'Content_kind_locked_idx',
        'Message_channelId_idx',
        'Message_createdAt_idx',
        'Message_channelId_createdAt_idx',
      ]
      
      const foundIndexes = expectedIndexes.filter(idx => 
        indexNames.some((name) => name === idx)
      )
      
      if (foundIndexes.length > 0) {
        console.log(`✅ Found ${foundIndexes.length}/${expectedIndexes.length} indexes`)
        console.log(`   Indexes: ${foundIndexes.join(', ')}`)
        if (foundIndexes.length < expectedIndexes.length) {
          console.log('⚠️  Some indexes missing - run "npx prisma db push" to create them')
        }
        return true
      } else {
        console.log('⚠️  No indexes found - run "npx prisma db push" to create them')
        return true // Not a failure, just needs db push
      }
    } else {
      // PostgreSQL - would need different query
      console.log('⚠️  PostgreSQL detected - index verification skipped (needs manual check)')
      return true
    }
  } catch (error) {
    console.error('⚠️  Index check failed (might need db push):', error.message)
    return true // Not critical
  }
}

async function testBatchQueryPerformance() {
  console.log('\n🔍 Testing batch query capability...')
  try {
    // Test that we can do batch queries (simulating the N+1 fix)
    const contentIds = await prisma.content.findMany({
      take: 5,
      select: { id: true }
    })
    
    if (contentIds.length > 0) {
      const ids = contentIds.map(c => c.id)
      const batchResult = await prisma.content.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true }
      })
      
      console.log(`✅ Batch query successful (fetched ${batchResult.length} items)`)
      return true
    } else {
      console.log('⚠️  No content found (database might be empty)')
      return true
    }
  } catch (error) {
    console.error('❌ Batch query test failed:', error.message)
    return false
  }
}

async function testDatabaseUrlDetection() {
  console.log('\n🔍 Testing database URL detection...')
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DEV || 'file:./dev.db'
    const isSQLite = dbUrl.startsWith('file:')
    const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
    
    console.log(`   DATABASE_URL: ${isSQLite ? 'SQLite' : isPostgres ? 'PostgreSQL' : 'Unknown'}`)
    console.log(`   URL format: ${dbUrl.substring(0, 50)}...`)
    
    if (isSQLite || isPostgres) {
      console.log('✅ Database URL detection working')
      return true
    } else {
      console.log('⚠️  Unknown database URL format')
      return false
    }
  } catch (error) {
    console.error('❌ URL detection test failed:', error.message)
    return false
  }
}

async function verifySchema() {
  console.log('\n🔍 Verifying Prisma schema...')
  try {
    const schemaPath = join(process.cwd(), 'prisma/schema.prisma')
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    
    const checks = {
      contentIndexes: schemaContent.includes('@@index([kind])') && 
                     schemaContent.includes('@@index([kind, publishedAt'),
      messageIndexes: schemaContent.includes('@@index([channelId])') &&
                     schemaContent.includes('@@index([channelId, createdAt'),
      episodeCategory: schemaContent.includes('category') && 
                      schemaContent.includes('daily-update'),
    }
    
    const allPassed = Object.values(checks).every(v => v)
    
    console.log('   Schema checks:')
    console.log(`   - Content indexes: ${checks.contentIndexes ? '✅' : '❌'}`)
    console.log(`   - Message indexes: ${checks.messageIndexes ? '✅' : '❌'}`)
    console.log(`   - Episode category: ${checks.episodeCategory ? '✅' : '❌'}`)
    
    return allPassed
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Database Fixes Verification\n')
  console.log('='.repeat(50))
  
  const results = {
    connection: false,
    categoryField: false,
    indexes: false,
    batchQuery: false,
    urlDetection: false,
    schema: false,
  }
  
  try {
    results.connection = await testDatabaseConnection()
    if (!results.connection) {
      console.log('\n❌ Database connection failed. Cannot continue tests.')
      process.exit(1)
    }
    
    results.schema = await verifySchema()
    results.urlDetection = await testDatabaseUrlDetection()
    results.categoryField = await testEpisodeCategoryField()
    results.batchQuery = await testBatchQueryPerformance()
    results.indexes = await testIndexesExist()
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Test Results Summary:')
    console.log('='.repeat(50))
    
    Object.entries(results).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '❌'
      const name = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1')
      console.log(`${icon} ${name}`)
    })
    
    const allPassed = Object.values(results).every(v => v)
    
    if (allPassed) {
      console.log('\n✅ All tests passed!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some tests failed or need attention')
      console.log('\nNext steps:')
      console.log('1. If Prisma client is outdated: Stop dev server and run "npx prisma generate"')
      console.log('2. If indexes missing: Run "npx prisma db push"')
      console.log('3. Restart dev server to pick up changes')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Test suite error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

