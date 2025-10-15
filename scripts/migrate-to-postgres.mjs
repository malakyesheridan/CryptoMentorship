#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates data from SQLite (dev) to PostgreSQL (production)
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { existsSync } from 'fs'

// Create separate Prisma clients for SQLite and PostgreSQL
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
})

const postgresClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function migrateData() {
  console.log('🚀 Starting database migration from SQLite to PostgreSQL...')
  
  try {
    // Check if SQLite database exists
    if (!existsSync('./prisma/dev.db')) {
      console.log('❌ SQLite database not found. Please run development setup first.')
      process.exit(1)
    }

    // Check PostgreSQL connection
    await postgresClient.$connect()
    console.log('✅ Connected to PostgreSQL database')

    // Get all data from SQLite
    console.log('📥 Exporting data from SQLite...')
    
    const users = await sqliteClient.user.findMany({
      include: {
        accounts: true,
        sessions: true,
        memberships: true,
        messages: true,
        audits: true,
        media: true,
        revisions: true,
        bookmarks: true,
        interests: true,
        viewEvents: true,
        notifications: true,
        notificationPreference: true,
        hostedEvents: true,
        rsvps: true,
        questions: true,
        votes: true,
        signalTrades: true,
        enrollments: true,
        lessonProgress: true,
        quizSubmissions: true,
        certificates: true,
        learningSessions: true,
        cohortEnrollments: true,
        videos: true,
        videoViews: true,
        securityEvents: true,
        userSessions: true,
      }
    })

    const content = await sqliteClient.content.findMany({
      include: {
        revisions: true,
        bookmarks: true,
        videos: true,
      }
    })

    const episodes = await sqliteClient.episode.findMany({
      include: {
        bookmarks: true,
      }
    })

    const channels = await sqliteClient.channel.findMany({
      include: {
        messages: true,
      }
    })

    const events = await sqliteClient.event.findMany({
      include: {
        rsvps: true,
        questions: true,
        chapters: true,
        transcript: true,
      }
    })

    const tracks = await sqliteClient.track.findMany({
      include: {
        sections: true,
        lessons: true,
        enrollments: true,
        certificates: true,
        cohorts: true,
      }
    })

    const signalTrades = await sqliteClient.signalTrade.findMany()
    const portfolioSettings = await sqliteClient.portfolioSetting.findMany()
    const perfSnapshots = await sqliteClient.perfSnapshot.findMany()

    console.log(`📊 Found ${users.length} users, ${content.length} content items, ${episodes.length} episodes`)

    // Clear PostgreSQL database
    console.log('🧹 Clearing PostgreSQL database...')
    await postgresClient.$executeRaw`TRUNCATE TABLE "User", "Account", "Session", "Membership", "Message", "Audit", "Media", "Revision", "Bookmark", "UserInterest", "ViewEvent", "Notification", "NotificationPreference", "Event", "RSVP", "Question", "Vote", "Transcript", "TranscriptSegment", "Chapter", "SignalTrade", "PortfolioSetting", "PerfSnapshot", "Track", "TrackSection", "Lesson", "Enrollment", "LessonProgress", "Quiz", "QuizSubmission", "Certificate", "LearningSession", "Cohort", "CohortEnrollment", "LessonRelease", "Video", "VideoView", "Channel", "Episode", "VerificationToken", "SecurityEvent", "UserSession" CASCADE`

    // Import data to PostgreSQL
    console.log('📤 Importing data to PostgreSQL...')

    // Import users first (they have foreign key dependencies)
    for (const user of users) {
      const { accounts, sessions, memberships, messages, audits, media, revisions, bookmarks, interests, viewEvents, notifications, notificationPreference, hostedEvents, rsvps, questions, votes, signalTrades, enrollments, lessonProgress, quizSubmissions, certificates, learningSessions, cohortEnrollments, videos, videoViews, securityEvents, userSessions, ...userData } = user
      
      await postgresClient.user.create({
        data: userData
      })
    }

    // Import other data
    for (const item of content) {
      const { revisions, bookmarks, videos, ...contentData } = item
      await postgresClient.content.create({
        data: contentData
      })
    }

    for (const item of episodes) {
      const { bookmarks, ...episodeData } = item
      await postgresClient.episode.create({
        data: episodeData
      })
    }

    for (const item of channels) {
      const { messages, ...channelData } = item
      await postgresClient.channel.create({
        data: channelData
      })
    }

    for (const item of events) {
      const { rsvps, questions, chapters, transcript, ...eventData } = item
      await postgresClient.event.create({
        data: eventData
      })
    }

    for (const item of tracks) {
      const { sections, lessons, enrollments, certificates, cohorts, ...trackData } = item
      await postgresClient.track.create({
        data: trackData
      })
    }

    // Import remaining data
    for (const item of signalTrades) {
      await postgresClient.signalTrade.create({ data: item })
    }

    for (const item of portfolioSettings) {
      await postgresClient.portfolioSetting.create({ data: item })
    }

    for (const item of perfSnapshots) {
      await postgresClient.perfSnapshot.create({ data: item })
    }

    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('🎉 Your data has been migrated to Neon PostgreSQL')
    console.log('📊 Summary:')
    console.log(`   - ${users.length} users migrated`)
    console.log(`   - ${content.length} content items migrated`)
    console.log(`   - ${episodes.length} episodes migrated`)
    console.log(`   - ${events.length} events migrated`)
    console.log(`   - ${tracks.length} learning tracks migrated`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sqliteClient.$disconnect()
    await postgresClient.$disconnect()
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData()
}

export { migrateData }
